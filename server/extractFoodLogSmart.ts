import type { FoodLogExtraction } from '../services/schemas/foodLogExtractionSchema';
import { extractFoodLog } from '../services/localLlmService';
import { normalizeFoodLogExtraction } from '../services/foodLogExtractionNormalize';
import { fastExtractFoodLog } from './fastPathExtract';

export const extractFoodLogSmart = async (args: {
  isoDatetime: string;
  timezone: string;
  countryIso2: string;
  userText: string;
}): Promise<{ extraction: FoodLogExtraction; usedFastPath: boolean }> => {
  const fast = fastExtractFoodLog({ isoDatetime: args.isoDatetime, userText: args.userText, timezone: args.timezone });
  if (fast) {
    return {
      extraction: normalizeFoodLogExtraction(fast, { userText: args.userText, isoDatetime: args.isoDatetime }),
      usedFastPath: true,
    };
  }

  const raw = await extractFoodLog({
    isoDatetime: args.isoDatetime,
    timezone: args.timezone,
    countryIso2: args.countryIso2,
    userText: args.userText,
  });

  return {
    extraction: normalizeFoodLogExtraction(raw, { userText: args.userText, isoDatetime: args.isoDatetime }),
    usedFastPath: false,
  };
};
