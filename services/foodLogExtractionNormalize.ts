import type { FoodLogExtraction, FoodLogExtractionItem, LookupRequest } from './schemas/foodLogExtractionSchema';

const BARCODE_RE = /^\d{8,14}$/;
const QTY_UNIT_RE = /^\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|oz|lb|lbs)\b\s*/i;
const BARCODE_IN_TEXT_RE = /\b(\d{8,14})\b/;

const compactSpaces = (s: string) => s.replace(/\s+/g, ' ').trim();

const normalizeBarcode = (barcode: string | null) => {
  if (!barcode) return null;
  const cleaned = barcode.replace(/\s+/g, '');
  return BARCODE_RE.test(cleaned) ? cleaned : null;
};

const barcodeFromUserText = (userText: string) => {
  const m = userText.match(BARCODE_IN_TEXT_RE);
  return m ? normalizeBarcode(m[1]) : null;
};

const buildSearchQuery = (fallback: string, itemName: string, brand: string | null) => {
  const base = (itemName || fallback).toLowerCase();
  // Remove quantities like "200" but keep variant hints like "0%" (percentages).
  const withoutNumbers = base.replace(/\b\d+(?:[.,]\d+)?\b(?!\s*%)/g, ' ');
  const withoutUnits = withoutNumbers.replace(
    /\b(g|gram|grams|kg|ml|l|oz|lb|lbs|cup|cups|tbsp|tsp)\b/g,
    ' '
  );
  const withoutMealWords = withoutUnits.replace(/\b(breakfast|lunch|dinner|snack)\b/g, ' ');
  const withoutBrand = brand ? withoutMealWords.replace(new RegExp(`\\b${brand.toLowerCase()}\\b`, 'g'), ' ') : withoutMealWords;
  const withoutPunct = withoutBrand.replace(/[,:;"'()[\]{}]/g, ' ');
  const cleaned = compactSpaces(withoutPunct).trim();
  return cleaned.length > 0 ? cleaned : compactSpaces(base);
};

const SOUNDS_PACKAGED_RE =
  /\b(biscotti|biscotto|cereali|merendina|merendine|cracker|patatine|chips|barretta|barrette|cioccolato|gelato|bibita|bevanda|soda)\b/i;

const soundsPackaged = (itemName: string) => SOUNDS_PACKAGED_RE.test(itemName);

const rebuildLookupRequests = (item: FoodLogExtractionItem): LookupRequest[] => {
  const barcode = normalizeBarcode(item.barcode);
  const brand = item.brand ? compactSpaces(item.brand) : null;

  if (barcode) {
    return [{ provider: 'open_food_facts', type: 'barcode', query: barcode }];
  }

  if (brand) {
    const q = compactSpaces(`${item.item_name} ${brand}`);
    return [
      { provider: 'open_food_facts', type: 'text', query: q },
      { provider: 'fooddata_central', type: 'text', query: q },
    ];
  }

  const reqs: LookupRequest[] = [{ provider: 'fooddata_central', type: 'text', query: item.search_query }];
  if (soundsPackaged(item.item_name)) {
    reqs.push({ provider: 'open_food_facts', type: 'text', query: item.search_query });
  }
  return reqs;
};

const stripLeadingMealPrefix = (s: string) => {
  // e.g. "Breakfast: ..."
  return s.replace(/^\s*(for\s+)?(breakfast|lunch|dinner|snack)\s*:\s*/i, '').trim();
};

const trySplitSingleItemFromUserText = (
  userText: string
): Array<Pick<FoodLogExtractionItem, 'item_name' | 'qty' | 'unit'>> | null => {
  const t = stripLeadingMealPrefix(compactSpaces(userText));
  // Conservative: split only when both sides clearly start with a quantity.
  const match = t.match(/^(.*?)(?:\s+\be\b|\s+\band\b)\s+(.*)$/i);
  if (!match) return null;
  const left = match[1].trim();
  const right = match[2].trim();

  const m1 = left.match(QTY_UNIT_RE);
  const m2 = right.match(QTY_UNIT_RE) || right.match(/^\s*(\d+(?:[.,]\d+)?)\b\s*/); // allow "1 banana"
  if (!m1 || !m2) return null;

  const qty1 = Number(String(m1[1]).replace(',', '.'));
  const unit1 = String(m1[2] || '').toLowerCase();
  const name1 = compactSpaces(left.slice(m1[0].length));

  const qty2 = Number(String(m2[1]).replace(',', '.'));
  const unit2 = (m2[2] ? String(m2[2]).toLowerCase() : null) as string | null;
  const name2 = compactSpaces(right.slice(m2[0].length));

  if (!Number.isFinite(qty1) || !Number.isFinite(qty2) || !name1 || !name2) return null;
  return [
    { item_name: name1, qty: qty1, unit: unit1 || null },
    { item_name: name2, qty: qty2, unit: unit2 },
  ];
};

export const normalizeFoodLogExtraction = (
  extraction: FoodLogExtraction,
  ctx: { userText: string; isoDatetime: string }
): FoodLogExtraction => {
  const datetimeLocal = compactSpaces(extraction.datetime_local || '') || ctx.isoDatetime;
  const detectedBarcode = barcodeFromUserText(ctx.userText);

  const maybeSplit =
    extraction.items.length === 1 ? trySplitSingleItemFromUserText(ctx.userText) : null;

  const baseItems: FoodLogExtractionItem[] = maybeSplit
    ? maybeSplit.map((p) => ({
        item_name: p.item_name,
        qty: p.qty ?? null,
        unit: p.unit ?? null,
        brand: null,
        barcode: null,
        search_query: p.item_name.toLowerCase(),
        lookup_requests: [],
        notes: null,
      }))
    : extraction.items;

  const items = baseItems.map((it) => {
    const itemName = compactSpaces(it.item_name);
    const brand = it.brand ? compactSpaces(it.brand) : null;
    const barcode =
      normalizeBarcode(it.barcode) ||
      (detectedBarcode && extraction.items.length === 1 ? detectedBarcode : null);
    const searchQuery = buildSearchQuery(it.search_query || ctx.userText, itemName, brand);

    const normalized: FoodLogExtractionItem = {
      item_name: itemName,
      qty: it.qty ?? null,
      unit: it.unit ? compactSpaces(it.unit) : null,
      brand,
      barcode,
      search_query: searchQuery,
      lookup_requests: [],
      notes: it.notes ?? null,
    };

    normalized.lookup_requests = rebuildLookupRequests(normalized);
    return normalized;
  });

  // Deduplicate exact duplicates (small models sometimes repeat the same item twice).
  const seen = new Set<string>();
  const dedupedItems: FoodLogExtractionItem[] = [];
  for (const it of items) {
    const key = JSON.stringify({
      item_name: it.item_name,
      qty: it.qty,
      unit: it.unit,
      brand: it.brand,
      barcode: it.barcode,
      search_query: it.search_query,
      lookup_requests: it.lookup_requests,
      notes: it.notes,
    });
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedItems.push(it);
  }

  const firstMissingQty = dedupedItems.find((i) => i.qty == null || i.unit == null);
  const needsClarification =
    Boolean(extraction.needs_clarification) || Boolean(firstMissingQty);
  const clarificationQuestion =
    needsClarification
      ? extraction.clarification_question ??
        (firstMissingQty ? `For "${firstMissingQty.item_name}", how many grams?` : null)
      : null;

  return {
    meal: extraction.meal,
    datetime_local: datetimeLocal,
    items: dedupedItems,
    needs_clarification: needsClarification,
    clarification_question: clarificationQuestion,
    confidence: needsClarification ? Math.min(extraction.confidence, 0.69) : extraction.confidence,
  };
};
