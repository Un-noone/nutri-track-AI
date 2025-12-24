import type { FoodLogExtraction } from '../services/schemas/foodLogExtractionSchema';
import type { Meal } from '../services/schemas/foodLogExtractionSchema';
import { deterministicMealLabel } from '../services/mealInference';

const BARCODE_RE = /\b(\d{8,14})\b/;

const stripMealPrefix = (s: string) =>
  s.replace(/^\s*(for\s+)?(breakfast|lunch|dinner|snack)\s*:\s*/i, '').trim();

const parseNumber = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const normalizeUnit = (u: string) => {
  const unit = u.toLowerCase();
  if (['g', 'gram', 'grams'].includes(unit)) return 'g';
  if (['kg', 'kilogram', 'kilograms'].includes(unit)) return 'kg';
  if (['mg', 'milligram', 'milligrams'].includes(unit)) return 'mg';
  if (['ml', 'milliliter', 'milliliters'].includes(unit)) return 'ml';
  if (['l', 'liter', 'liters'].includes(unit)) return 'l';
  if (['oz', 'ounce', 'ounces'].includes(unit)) return 'oz';
  if (['lb', 'lbs', 'pound', 'pounds'].includes(unit)) return 'lb';
  return unit;
};

const stripTimeHints = (name: string) => {
  let s = name;
  // English time hints: "at 9am", "at 10:30 pm", "today", "yesterday"
  s = s.replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)\b/gi, '');
  s = s.replace(/\b(today|yesterday|this morning|tonight)\b/gi, '');
  return s.replace(/\s+/g, ' ').trim();
};

const splitSegments = (text: string) => {
  const cleaned = stripMealPrefix(text);
  return cleaned
    .split(/\s*(?:,|;|\be\b|\band\b)\s+/i)
    .map(s => s.trim())
    .filter(Boolean);
};

const parseSegment = (seg: string) => {
  // 200 g yogurt
  let m = seg.match(
    /^\s*(\d+(?:[.,]\d+)?)\s*(g|gram|grams|kg|kilogram|kilograms|mg|milligram|milligrams|ml|milliliter|milliliters|l|liter|liters|oz|ounce|ounces|lb|lbs|pound|pounds)\b\s*(.+)\s*$/i
  );
  if (m) {
    return {
      item_name: stripTimeHints(m[3].trim()),
      qty: parseNumber(m[1]),
      unit: normalizeUnit(m[2]),
      confidence: 1,
    };
  }

  // 1 banana (unitless)
  m = seg.match(/^\s*(\d+(?:[.,]\d+)?)\b\s+(.+)\s*$/i);
  if (m) {
    return {
      item_name: stripTimeHints(m[2].trim()),
      qty: parseNumber(m[1]),
      unit: null,
      confidence: 0.8,
    };
  }

  // fallback
  return { item_name: stripTimeHints(seg.trim()), qty: null, unit: null, confidence: 0.5 };
};

const deriveItemNameFromBarcodeText = (text: string) => {
  const withoutBarcode = text.replace(/\bbarcode\b/i, '').replace(BARCODE_RE, '');
  const cleaned = stripMealPrefix(withoutBarcode)
    .replace(/[.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > 0 ? cleaned : 'Prodotto';
};

export const fastExtractFoodLog = (args: {
  isoDatetime: string;
  userText: string;
  timezone?: string;
}): FoodLogExtraction | null => {
  const { isoDatetime, userText } = args;
  const dt = new Date(isoDatetime);
  const meal: Meal = deterministicMealLabel(
    userText,
    Number.isFinite(dt.getTime()) ? dt : new Date(),
    args.timezone
  );

  const barcodeMatch = userText.match(BARCODE_RE);
  if (barcodeMatch) {
    const barcode = barcodeMatch[1];
    return {
      meal,
      datetime_local: isoDatetime,
      items: [
        {
          item_name: deriveItemNameFromBarcodeText(userText),
          qty: null,
          unit: null,
          brand: null,
          barcode,
          search_query: deriveItemNameFromBarcodeText(userText).toLowerCase(),
          lookup_requests: [{ provider: 'open_food_facts', type: 'barcode', query: barcode }],
          notes: null,
        },
      ],
      needs_clarification: false,
      clarification_question: null,
      confidence: 0.9,
    };
  }

  const segments = splitSegments(userText);
  const parsed = segments.map(parseSegment).filter(p => p.item_name.length > 0);
  if (parsed.length === 0) return null;
  // If there's no explicit quantity anywhere, prefer the LLM (better item splitting/names).
  if (parsed.every(p => p.qty == null)) return null;

  // If we have a trailing "100 grams/about/circa" segment, apply it to the previous item as grams.
  const approxWords = new Set(['about', 'approx', 'approximately', 'circa', 'moreless', 'more or less', 'ca']);
  const last = parsed[parsed.length - 1];
  if (
    parsed.length >= 2 &&
    last.qty != null &&
    last.unit &&
    normalizeUnit(last.unit) === 'g' &&
    (!last.item_name || approxWords.has(last.item_name.toLowerCase()))
  ) {
    const prev = parsed[parsed.length - 2];
    prev.qty = last.qty;
    prev.unit = 'g';
    parsed.pop();
  }

  const avgConfidence = parsed.reduce((a, p) => a + p.confidence, 0) / parsed.length;
  return {
    meal,
    datetime_local: isoDatetime,
    items: parsed.map(p => ({
      item_name: p.item_name,
      qty: p.qty,
      unit: p.unit,
      brand: null,
      barcode: null,
      search_query: p.item_name.toLowerCase(),
      lookup_requests: [],
      notes: null,
    })),
    needs_clarification: false,
    clarification_question: null,
    confidence: Math.max(0, Math.min(1, avgConfidence)),
  };
};
