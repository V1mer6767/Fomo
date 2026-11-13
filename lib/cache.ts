/** In-memory TTL cache with stale-on-error and in-flight de-duplication (per server instance). */
interface Entry<T> { v: T; t: number }
const store = new Map<string, Entry<any>>();
const inflight = new Map<string, Promise<any>>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<{ value: T; stale: boolean; at: number }> {
  const e = store.get(key);
  const now = Date.now();
  if (e && now - e.t < ttlMs) return { value: e.v, stale: false, at: e.t };
  let p = inflight.get(key);
  if (!p) { p = load().finally(() => inflight.delete(key)); inflight.set(key, p); }
  try {
    const v = await p; store.set(key, { v, t: Date.now() }); return { value: v, stale: false, at: Date.now() };
  } catch (err) {
    if (e) return { value: e.v, stale: true, at: e.t };
    throw err;
  }
}
export function clearCache() { store.clear(); inflight.clear(); }

/** Simple per-key rate limiter (min interval between upstream calls). */
const last = new Map<string, number>();
export async function throttle(key: string, minMs: number) {
  const w = (last.get(key) ?? 0) + minMs - Date.now();
  last.set(key, Math.max(Date.now(), (last.get(key) ?? 0) + minMs));
  if (w > 0) await new Promise(r => setTimeout(r, w));
}
