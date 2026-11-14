"use client";
import { useCallback, useEffect, useState } from "react";
import type { CloudAdapter } from "./cloud";

/** Storage abstraction behind every useSetting() hook. Local mode: localStorage. Signed-in mode: Supabase (see lib/cloud.ts). */
export interface Store { get<T>(k: string, d: T): T; set<T>(k: string, v: T): void }
const emit = (k: string) => window.dispatchEvent(new CustomEvent("fomo-store", { detail: k }));

export const localStore: Store = {
  get(k, d) { try { const r = localStorage.getItem("fomo:" + k); return r == null ? d : JSON.parse(r); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("fomo:" + k, JSON.stringify(v)); emit(k); } catch {} },
};
export function clearLocalData() { try { Object.keys(localStorage).filter(k => k.startsWith("fomo:")).forEach(k => localStorage.removeItem(k)); } catch {} }

export interface CloudStore extends Store { hydrate(): Promise<void>; flush(): Promise<void>; dispose(): void }
/** In-memory cache that writes through (debounced) to the cloud adapter. Keys the adapter doesn't know stay in localStorage. */
export function createCloudStore(adapter: CloudAdapter, onError?: (e: Error) => void): CloudStore {
  const cache = new Map<string, unknown>(); const timers = new Map<string, ReturnType<typeof setTimeout>>(); const dirty = new Set<string>();
  const cloud = (k: string) => adapter.keys.includes(k);
  const save = async (k: string, attempt = 0): Promise<void> => {
    timers.delete(k);
    try { await adapter.save(k, cache.get(k)); dirty.delete(k); onError?.(null as any); }
    catch (e: any) { if (attempt < 3) { timers.set(k, setTimeout(() => save(k, attempt + 1), 4000 * (attempt + 1))); } else { dirty.delete(k); } onError?.(e instanceof Error ? e : new Error(String(e))); }
  };
  const beforeUnload = () => { dirty.forEach(k => { void save(k); }); };
  if (typeof window !== "undefined") window.addEventListener("beforeunload", beforeUnload);
  return {
    get(k, d) { return cloud(k) ? (cache.has(k) ? (cache.get(k) as any) : d) : localStore.get(k, d); },
    set(k, v) {
      if (!cloud(k)) return localStore.set(k, v);
      cache.set(k, v); emit(k); dirty.add(k); clearTimeout(timers.get(k)); timers.set(k, setTimeout(() => save(k), 400));
    },
    async hydrate() {
      await Promise.all(adapter.keys.map(async k => { try { const v = await adapter.load(k); if (v !== undefined && !dirty.has(k)) cache.set(k, v); } catch (e: any) { onError?.(e); } }));
      adapter.keys.forEach(emit);
    },
    async flush() { await Promise.all([...dirty].map(k => { clearTimeout(timers.get(k)); return save(k, 3); })); },
    dispose() { timers.forEach(clearTimeout); timers.clear(); cache.clear(); dirty.clear(); if (typeof window !== "undefined") window.removeEventListener("beforeunload", beforeUnload); },
  };
}

let store: Store = localStore;
export function setStore(s: Store) { store = s; if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("fomo-store-reset")); }

export function useSetting<T>(key: string, def: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(def);
  useEffect(() => {
    const read = () => setV(store.get(key, def));
    read();
    const h = (e: Event) => { if ((e as CustomEvent).detail === key) read(); };
    window.addEventListener("fomo-store", h); window.addEventListener("fomo-store-reset", read);
    return () => { window.removeEventListener("fomo-store", h); window.removeEventListener("fomo-store-reset", read); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback((n: T) => { setV(n); store.set(key, n); }, [key]);
  return [v, set];
}
