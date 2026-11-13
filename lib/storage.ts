"use client";
import { useCallback, useEffect, useState } from "react";

/** Storage abstraction. Default: localStorage. A Supabase adapter can implement the same interface (see supabase/schema.sql + README). */
export interface Store { get<T>(k: string, d: T): T; set<T>(k: string, v: T): void }
export const localStore: Store = {
  get(k, d) { try { const r = localStorage.getItem("fomo:" + k); return r == null ? d : JSON.parse(r); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("fomo:" + k, JSON.stringify(v)); window.dispatchEvent(new CustomEvent("fomo-store", { detail: k })); } catch {} },
};
let store: Store = localStore;
export function setStore(s: Store) { store = s; }

export function useSetting<T>(key: string, def: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(def);
  useEffect(() => {
    setV(store.get(key, def));
    const h = (e: Event) => { if ((e as CustomEvent).detail === key) setV(store.get(key, def)); };
    window.addEventListener("fomo-store", h);
    return () => window.removeEventListener("fomo-store", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback((n: T) => { setV(n); store.set(key, n); }, [key]);
  return [v, set];
}
