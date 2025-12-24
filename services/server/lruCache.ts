type Entry<V> = { value: V; expiresAt: number };

export class LruCache<K, V> {
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly map = new Map<K, Entry<V>>();

  constructor(opts: { maxEntries: number; ttlMs: number }) {
    this.maxEntries = opts.maxEntries;
    this.ttlMs = opts.ttlMs;
  }

  get(key: K): V | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    // mark as recently used
    this.map.delete(key);
    this.map.set(key, e);
    return e.value;
  }

  set(key: K, value: V): void {
    const entry: Entry<V> = { value, expiresAt: Date.now() + this.ttlMs };
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, entry);

    while (this.map.size > this.maxEntries) {
      const oldestKey = this.map.keys().next().value as K | undefined;
      if (oldestKey === undefined) break;
      this.map.delete(oldestKey);
    }
  }
}

