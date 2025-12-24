import { z } from 'zod';

export const MealSchema = z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']);

export const LookupRequestSchema = z
  .object({
    provider: z.enum(['open_food_facts', 'fooddata_central']),
    type: z.enum(['barcode', 'text']),
    query: z.string(),
  })
  .strict();

export const FoodLogExtractionItemSchema = z
  .object({
    item_name: z.string(),
    qty: z.number().finite().nullable(),
    unit: z.string().nullable(),
    brand: z.string().nullable(),
    barcode: z.string().nullable(),
    search_query: z.string(),
    lookup_requests: z.array(LookupRequestSchema),
    notes: z.string().nullable(),
  })
  .strict();

export const FoodLogExtractionSchema = z
  .object({
    meal: MealSchema,
    datetime_local: z.string(),
    items: z.array(FoodLogExtractionItemSchema),
    needs_clarification: z.boolean(),
    clarification_question: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export type Meal = z.infer<typeof MealSchema>;
export type FoodLogExtraction = z.infer<typeof FoodLogExtractionSchema>;
export type FoodLogExtractionItem = z.infer<typeof FoodLogExtractionItemSchema>;
export type LookupRequest = z.infer<typeof LookupRequestSchema>;
