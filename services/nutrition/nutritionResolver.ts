import type { FoodItem, NutrientTotals } from '../../types';
import type { FoodLogExtractionItem } from '../schemas/foodLogExtractionSchema';
import { getProductByBarcode, searchProducts, type OffProduct, type OffProductHit } from './openFoodFactsService';
import { getFoodDetails, isFdcEnabled, searchFoods, type FdcFood, type FdcHit } from './foodDataCentralService';
import { mapWithConcurrency } from '../server/concurrency';

type NutrientsPer100g = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type ResolveNutritionResult = {
  items: FoodItem[];
  needsClarification: boolean;
  clarificationQuestion: string | null;
  confidencePenalty: number; // 0..1 additional penalty
};

const getNumber = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim().length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const extractOffPer100g = (p: OffProduct | OffProductHit): NutrientsPer100g | null => {
  const n = p.nutriments;
  if (!n) return null;

  const kcal =
    getNumber(n['energy-kcal_100g']) ??
    (() => {
      const kj = getNumber(n['energy_100g']);
      return kj == null ? null : kj / 4.184;
    })();

  const protein = getNumber(n['proteins_100g']);
  const carbs = getNumber(n['carbohydrates_100g']);
  const fat = getNumber(n['fat_100g']);

  if (kcal == null && protein == null && carbs == null && fat == null) return null;
  return {
    calories: kcal ?? 0,
    protein_g: protein ?? 0,
    carbs_g: carbs ?? 0,
    fat_g: fat ?? 0,
  };
};

const extractFdcPer100g = (food: FdcFood): NutrientsPer100g | null => {
  const nutrients = food.foodNutrients;
  if (!Array.isArray(nutrients) || nutrients.length === 0) return null;

  const find = (name: string) => nutrients.find(n => (n.nutrientName || '').toLowerCase() === name.toLowerCase());

  const energy = find('Energy');
  const protein = find('Protein');
  const carbs = find('Carbohydrate, by difference');
  const fat = find('Total lipid (fat)');

  const kcal = getNumber(energy?.value);
  const kcalUnit = (energy?.unitName || '').toUpperCase();
  const kcalNorm = kcal == null ? null : kcalUnit === 'KJ' ? kcal / 4.184 : kcal;

  const proteinVal = getNumber(protein?.value);
  const carbsVal = getNumber(carbs?.value);
  const fatVal = getNumber(fat?.value);

  if (kcalNorm == null && proteinVal == null && carbsVal == null && fatVal == null) return null;
  return {
    calories: kcalNorm ?? 0,
    protein_g: proteinVal ?? 0,
    carbs_g: carbsVal ?? 0,
    fat_g: fatVal ?? 0,
  };
};

const normalizeBrand = (s: string | null | undefined) => (s || '').trim().toLowerCase();

const offBestHit = (hits: OffProductHit[], brand: string | null): OffProductHit | null => {
  if (hits.length === 0) return null;
  if (!brand) return hits[0];
  const b = normalizeBrand(brand);
  const match = hits.find(h => normalizeBrand(h.brands).includes(b));
  return match || hits[0];
};

const fdcBestHit = (hits: FdcHit[], brand: string | null): FdcHit | null => {
  if (hits.length === 0) return null;
  if (!brand) return hits[0];
  const b = normalizeBrand(brand);
  const match = hits.find(h => normalizeBrand(h.brandOwner).includes(b));
  return match || hits[0];
};

const tryResolvePer100g = async (
  item: FoodLogExtractionItem,
  countryIso2?: string
): Promise<{ per100g: NutrientsPer100g | null; source: string | null }> => {
  for (const req of item.lookup_requests) {
    if (req.provider === 'open_food_facts') {
      if (req.type === 'barcode') {
        const p = await getProductByBarcode(req.query);
        const per100g = p ? extractOffPer100g(p) : null;
        if (per100g) return { per100g, source: 'open_food_facts' };
      } else {
        const hits = await searchProducts(req.query, countryIso2);
        const best = offBestHit(hits, item.brand);
        const per100g = best ? extractOffPer100g(best) : null;
        if (per100g) return { per100g, source: 'open_food_facts' };
      }
    }

    if (req.provider === 'fooddata_central') {
      if (!isFdcEnabled()) continue;
      if (req.type === 'barcode') {
        // FDC doesn't support direct barcode lookup on the free endpoints; treat as text fallback.
        const hits = await searchFoods(req.query);
        const best = fdcBestHit(hits, item.brand);
        const details = best ? await getFoodDetails(best.fdcId) : null;
        const per100g = details ? extractFdcPer100g(details) : null;
        if (per100g) return { per100g, source: 'fooddata_central' };
      } else {
        const hits = await searchFoods(req.query);
        const best = fdcBestHit(hits, item.brand);
        const details = best ? await getFoodDetails(best.fdcId) : null;
        const per100g = details ? extractFdcPer100g(details) : null;
        if (per100g) return { per100g, source: 'fooddata_central' };
      }
    }
  }

  // As a last resort, try OFF text search with normalized query.
  const offHits = await searchProducts(item.search_query, countryIso2);
  const offBest = offBestHit(offHits, item.brand);
  const offPer100g = offBest ? extractOffPer100g(offBest) : null;
  if (offPer100g) return { per100g: offPer100g, source: 'open_food_facts' };

  if (isFdcEnabled()) {
    const hits = await searchFoods(item.search_query);
    const best = fdcBestHit(hits, item.brand);
    const details = best ? await getFoodDetails(best.fdcId) : null;
    const per100g = details ? extractFdcPer100g(details) : null;
    if (per100g) return { per100g, source: 'fooddata_central' };
  }

  return { per100g: null, source: null };
};

const gramsFromQtyUnit = (qty: number | null, unit: string | null): number | null => {
  if (qty == null || unit == null) return null;
  const u = unit.trim().toLowerCase();

  if (['g', 'gram', 'grams'].includes(u)) return qty;
  if (['kg', 'kilogram', 'kilograms'].includes(u)) return qty * 1000;
  if (['mg', 'milligram', 'milligrams'].includes(u)) return qty / 1000;
  if (['oz', 'ounce', 'ounces'].includes(u)) return qty * 28.3495;
  if (['lb', 'lbs', 'pound', 'pounds'].includes(u)) return qty * 453.592;

  return null;
};

const scalePer100g = (per100g: NutrientsPer100g, grams: number): NutrientTotals => {
  const factor = grams / 100;
  return {
    calories: per100g.calories * factor,
    protein_g: per100g.protein_g * factor,
    carbs_g: per100g.carbs_g * factor,
    fat_g: per100g.fat_g * factor,
  };
};

const toFoodItem = (item: FoodLogExtractionItem, nutrientsTotal: NutrientTotals): FoodItem => {
  return {
    name: item.item_name,
    quantity: item.qty ?? 1,
    unit: item.unit ?? 'serving',
    nutrients_total: nutrientsTotal,
  };
};

export const resolveNutrition = async (
  items: FoodLogExtractionItem[],
  opts?: { countryIso2?: string }
): Promise<ResolveNutritionResult> => {
  const concurrency = (() => {
    const raw = process.env.NUTRITION_CONCURRENCY;
    const n = raw ? Number(raw) : 4;
    return Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : 4;
  })();

  const perItem = await mapWithConcurrency(items, concurrency, async (item) => {
    const grams = gramsFromQtyUnit(item.qty, item.unit);
    if (grams == null) {
      return {
        foodItem: null as FoodItem | null,
        needsClarification: true,
        clarificationQuestion: `For "${item.item_name}", how many grams did you eat?`,
        confidencePenalty: 0.2,
      };
    }

    const { per100g } = await tryResolvePer100g(item, opts?.countryIso2);
    if (!per100g) {
      return {
        foodItem: null as FoodItem | null,
        needsClarification: true,
        clarificationQuestion: `I couldn't find nutrition data for "${item.item_name}". Can you provide a brand or barcode?`,
        confidencePenalty: 0.2,
      };
    }

    return {
      foodItem: toFoodItem(item, scalePer100g(per100g, grams)),
      needsClarification: false,
      clarificationQuestion: null as string | null,
      confidencePenalty: 0,
    };
  });

  const resolved: FoodItem[] = perItem.flatMap(r => (r.foodItem ? [r.foodItem] : []));
  const needsClarification = perItem.some(r => r.needsClarification);
  const clarificationQuestion = perItem.find(r => r.needsClarification)?.clarificationQuestion || null;
  const confidencePenalty = perItem.reduce((max, r) => Math.max(max, r.confidencePenalty), 0);

  return { items: resolved, needsClarification, clarificationQuestion, confidencePenalty };
};
