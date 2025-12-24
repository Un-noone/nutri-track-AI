import type { ParseResult } from '../types';
import { deterministicMealLabel } from '../services/mealInference';
import { resolveNutrition } from '../services/nutrition/nutritionResolver';
import { extractFoodLogSmart } from './extractFoodLogSmart';

type Args = {
  text: string;
  currentDateTime?: string;
  timezone?: string;
  countryIso2?: string;
};

const safeIso = (d: Date) => (Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString());

export const parseFoodLogServer = async ({
  text,
  currentDateTime,
  timezone,
  countryIso2,
}: Args): Promise<ParseResult> => {
  const baseDate = currentDateTime ? new Date(currentDateTime) : new Date();
  const baseIso = safeIso(baseDate);
  const tz =
    typeof timezone === 'string' && timezone.length > 0
      ? timezone
      : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const country =
    typeof countryIso2 === 'string' && countryIso2.length > 0
      ? countryIso2.toUpperCase()
      : (process.env.COUNTRY_ISO2 || 'US').toUpperCase();

  const { extraction } = await extractFoodLogSmart({
    isoDatetime: baseIso,
    timezone: tz,
    countryIso2: country,
    userText: text,
  });

  const dt = new Date(extraction.datetime_local || baseIso);
  const loggedAt = Number.isFinite(dt.getTime()) ? dt : new Date(baseIso);
  const meal = deterministicMealLabel(text, loggedAt, tz);

  const nutrition = await resolveNutrition(extraction.items, { countryIso2: country });
  const needsClarification = Boolean(extraction.needs_clarification || nutrition.needsClarification);
  const clarificationQuestion =
    extraction.clarification_question || nutrition.clarificationQuestion || null;

  const confidenceScore = Math.max(0, Math.min(1, extraction.confidence - nutrition.confidencePenalty));

  return needsClarification
    ? {
        items: [],
        logged_at_iso: loggedAt.toISOString(),
        meal_label: meal,
        needs_clarification: true,
        clarification_question:
          clarificationQuestion || 'Please provide the amount in grams or product details (brand/barcode).',
        confidence_score: confidenceScore,
      }
    : {
        items: nutrition.items,
        logged_at_iso: loggedAt.toISOString(),
        meal_label: meal,
        needs_clarification: false,
        clarification_question: null,
        confidence_score: confidenceScore,
      };
};
