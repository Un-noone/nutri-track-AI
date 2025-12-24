export const FOOD_LOG_EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'meal',
    'datetime_local',
    'items',
    'needs_clarification',
    'clarification_question',
    'confidence',
  ],
  properties: {
    meal: { type: 'string', enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'] },
    datetime_local: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'item_name',
          'qty',
          'unit',
          'brand',
          'barcode',
          'search_query',
          'lookup_requests',
          'notes',
        ],
        properties: {
          item_name: { type: 'string' },
          qty: { type: ['number', 'null'] },
          unit: { type: ['string', 'null'] },
          brand: { type: ['string', 'null'] },
          barcode: { type: ['string', 'null'] },
          search_query: { type: 'string' },
          lookup_requests: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['provider', 'type', 'query'],
              properties: {
                provider: { type: 'string', enum: ['open_food_facts', 'fooddata_central'] },
                type: { type: 'string', enum: ['barcode', 'text'] },
                query: { type: 'string' },
              },
            },
          },
          notes: { type: ['string', 'null'] },
        },
      },
    },
    needs_clarification: { type: 'boolean' },
    clarification_question: { type: ['string', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
} as const;

