import { LruCache } from '../server/lruCache';

export type FdcNutrient = {
  nutrientName?: string;
  unitName?: string;
  value?: number;
};

export type FdcHit = {
  fdcId: number;
  description?: string;
  brandOwner?: string;
};

export type FdcFood = {
  fdcId: number;
  description?: string;
  brandOwner?: string;
  foodNutrients?: FdcNutrient[];
};

const FDC_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const cache = new LruCache<string, unknown>({ maxEntries: 500, ttlMs: FDC_CACHE_TTL_MS });

const getApiKey = () => {
  const v = process.env.FDC_API_KEY;
  return typeof v === 'string' && v.length > 0 ? v : null;
};

export const isFdcEnabled = () => Boolean(getApiKey());

export const searchFoods = async (query: string): Promise<FdcHit[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const cacheKey = `fdc:search:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey) as FdcHit[] | undefined;
  if (cached !== undefined) return cached;

  const params = new URLSearchParams();
  params.set('api_key', apiKey);
  params.set('query', query);
  params.set('pageSize', '10');

  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    cache.set(cacheKey, []);
    return [];
  }

  const data = (await res.json()) as { foods?: FdcHit[] };
  const out = Array.isArray(data.foods) ? data.foods : [];
  cache.set(cacheKey, out);
  return out;
};

export const getFoodDetails = async (fdcId: number): Promise<FdcFood | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const cacheKey = `fdc:food:${fdcId}`;
  const cached = cache.get(cacheKey) as FdcFood | null | undefined;
  if (cached !== undefined) return cached;

  const params = new URLSearchParams();
  params.set('api_key', apiKey);

  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}?${params.toString()}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    cache.set(cacheKey, null);
    return null;
  }

  const out = (await res.json()) as FdcFood;
  cache.set(cacheKey, out);
  return out;
};
