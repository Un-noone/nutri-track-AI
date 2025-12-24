import { LruCache } from '../server/lruCache';

export type OffNutriments = Record<string, unknown>;

export type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: OffNutriments;
  serving_size?: string;
  quantity?: string;
  product_quantity?: number;
  product_quantity_unit?: string;
};

export type OffProductHit = OffProduct;

const OFF_BASE = 'https://world.openfoodfacts.org';
const OFF_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const cache = new LruCache<string, unknown>({ maxEntries: 500, ttlMs: OFF_CACHE_TTL_MS });

const OFF_FIELDS = [
  'product_name',
  'brands',
  'code',
  'nutriments',
  'serving_size',
  'quantity',
  'product_quantity',
  'product_quantity_unit',
].join(',');

export const getProductByBarcode = async (barcode: string): Promise<OffProduct | null> => {
  const cacheKey = `off:barcode:${barcode}`;
  const cached = cache.get(cacheKey) as OffProduct | null | undefined;
  if (cached !== undefined) return cached;

  const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}?fields=${encodeURIComponent(OFF_FIELDS)}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    cache.set(cacheKey, null);
    return null;
  }

  const data = (await res.json()) as { status?: number; product?: OffProduct };
  if (data.status !== 1 || !data.product) {
    cache.set(cacheKey, null);
    return null;
  }
  cache.set(cacheKey, data.product);
  return data.product;
};

export const searchProducts = async (query: string, countryIso2?: string): Promise<OffProductHit[]> => {
  const cacheKey = `off:search:${(countryIso2 || '').toUpperCase()}:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey) as OffProductHit[] | undefined;
  if (cached !== undefined) return cached;

  const params = new URLSearchParams();
  params.set('search_terms', query);
  params.set('page_size', '10');
  params.set('fields', OFF_FIELDS);
  if (countryIso2) {
    // OFF supports a country hint via `cc` (best-effort; ignored if unsupported).
    params.set('cc', countryIso2.toLowerCase());
  }

  const url = `${OFF_BASE}/api/v2/search?${params.toString()}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    cache.set(cacheKey, []);
    return [];
  }

  const data = (await res.json()) as { products?: OffProductHit[] };
  const out = Array.isArray(data.products) ? data.products : [];
  cache.set(cacheKey, out);
  return out;
};
