"use client";
import { useEffect, useState } from "react";
import type { ApiEnvelope, Quote } from "./types";

type Snap<T> = { env: ApiEnvelope<T> | null; error: string | null; loading: boolean };
const cache = new Map<string, Snap<any>>(); const subs = new Map<string, Set<() => void>>(); const timers = new Map<string, any>(); const busy = new Set<string>();
const emit = (k: string) => subs.get(k)?.forEach(f => f());
async function load(url: string) {
  if (busy.has(url)) return; busy.add(url);
  try {
    const r = await fetch(url); const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? r.statusText);
    cache.set(url, { env: j, error: null, loading: false });
  } catch (e: any) { const p = cache.get(url); cache.set(url, { env: p?.env ?? null, error: e.message, loading: false }); }
  finally { busy.delete(url); emit(url); }
}
export function useApi<T>(url: string | null, pollMs = 0): Snap<T> & { reload: () => void } {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!url) return;
    const f = () => tick(x => x + 1);
    (subs.get(url) ?? subs.set(url, new Set()).get(url)!).add(f);
    if (!cache.get(url)) { cache.set(url, { env: null, error: null, loading: true }); load(url); }
    if (pollMs && !timers.has(url)) timers.set(url, setInterval(() => load(url), pollMs));
    return () => { subs.get(url)!.delete(f); if (!subs.get(url)!.size && timers.has(url)) { clearInterval(timers.get(url)); timers.delete(url); } };
  }, [url, pollMs]);
  const s = (url && cache.get(url)) || { env: null, error: null, loading: !!url };
  return { ...s, reload: () => url && load(url) };
}
export const useQuotes = () => { const r = useApi<Quote[]>("/api/quotes", 60_000); return { ...r, quotes: r.env?.data ?? [], byId: Object.fromEntries((r.env?.data ?? []).map(q => [q.id, q])) as Record<string, Quote> }; };

export function fmtPrice(p: number | null | undefined) { if (p == null) return "—"; const a = Math.abs(p); return p.toLocaleString("en-US", { maximumFractionDigits: a >= 1000 ? 0 : a >= 10 ? 2 : a >= 1 ? 4 : 5 }); }
export const fmtPct = (p: number | null | undefined) => p == null ? "—" : `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;
export function fmtBig(n: number | null | undefined) { if (n == null) return "—"; const a = Math.abs(n); return a >= 1e12 ? (n / 1e12).toFixed(2) + "T" : a >= 1e9 ? (n / 1e9).toFixed(2) + "B" : a >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n.toFixed(0); }
export function ago(iso: string) { const m = Math.max(0, (Date.now() - +new Date(iso)) / 60000); return m < 1 ? "just now" : m < 60 ? `${Math.floor(m)}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; }
export type EventFull = import("./types").EventGroup & { analysis: import("./types").Analysis };
export const useNews = () => { const r = useApi<{ articles: import("./types").Article[]; events: EventFull[] }>("/api/news", 120_000); return { ...r, articles: r.env?.data.articles ?? [], events: r.env?.data.events ?? [] }; };
export const useCalendar = () => { const r = useApi<import("./types").CalEvent[]>("/api/calendar", 600_000); return { ...r, events: r.env?.data ?? [] }; };
