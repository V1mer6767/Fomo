import { ASSETS, asset } from "../assets";
import { cached, throttle } from "../cache";
import { getJson, getText } from "../http";
import type { AssetDef, Quote } from "../types";

export interface Bar { t: number; c: number }
const iso = () => new Date().toISOString();
const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);

/* ---------- Crypto: CoinGecko (no key, rate-limited) ---------- */
export async function fetchCrypto(): Promise<Quote[]> {
  const defs = ASSETS.filter(a => a.cls === "crypto");
  await throttle("coingecko", 1500);
  const ids = defs.map(d => d.cg).join(",");
  const rows = await getJson<any[]>(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h,7d`);
  return rows.map(r => {
    const d = defs.find(x => x.cg === r.id)!;
    return { id: d.id, symbol: d.symbol, name: d.name, cls: "crypto", price: r.current_price, change24h: r.price_change_percentage_24h_in_currency ?? r.price_change_percentage_24h ?? null,
      change7d: r.price_change_percentage_7d_in_currency ?? null, volume: r.total_volume, marketCap: r.market_cap,
      spark: (r.sparkline_in_7d?.price ?? []).filter((_: number, i: number) => i % 4 === 0), source: "CoinGecko", asOf: r.last_updated ?? iso() } as Quote;
  });
}

/* ---------- Forex: Frankfurter (ECB reference rates) + open.er-api latest ---------- */
const CCY = ["EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"];
interface FxSeries { dates: string[]; rates: Record<string, number>[] } // USD base
export async function fetchFxSeries(days = 40): Promise<FxSeries> {
  const end = new Date(), start = new Date(Date.now() - days * 864e5);
  const f = (d: Date) => d.toISOString().slice(0, 10);
  const j = await getJson<any>(`https://api.frankfurter.dev/v1/${f(start)}..${f(end)}?base=USD&symbols=${CCY.join(",")}`);
  const dates = Object.keys(j.rates).sort();
  return { dates, rates: dates.map(d => j.rates[d]) };
}
function pairPrice(def: AssetDef, usdRates: Record<string, number>): number | null {
  const [b, q] = def.pair!;
  const rb = b === "USD" ? 1 : usdRates[b], rq = q === "USD" ? 1 : usdRates[q];
  if (!rb || !rq) return null;
  return rq / rb; // price of 1 base in quote; usdRates = units of CCY per 1 USD
}
export async function fetchForex(): Promise<Quote[]> {
  const series = await fetchFxSeries(14);
  let latest: Record<string, number> | null = null; let asOf = series.dates.at(-1)! ; let src = "Frankfurter (ECB)";
  try {
    const j = await getJson<any>("https://open.er-api.com/v6/latest/USD", 6000);
    if (j.result === "success") { latest = j.rates; asOf = new Date(j.time_last_update_unix * 1000).toISOString(); src = "ExchangeRate-API (open) + ECB history"; }
  } catch { /* fall back to ECB */ }
  return ASSETS.filter(a => a.cls === "forex" && a.pair).map(def => {
    const hist = series.rates.map(r => pairPrice(def, r)).filter((x): x is number => x != null);
    const price = (latest ? pairPrice(def, latest) : null) ?? hist.at(-1) ?? null;
    const prev = hist.at(-2), wk = hist.at(-6);
    return { id: def.id, symbol: def.symbol, name: def.name, cls: "forex", price,
      change24h: price != null && prev ? pct(price, hist.length > 1 && latest ? hist.at(-1)! : prev) : null,
      change7d: price != null && wk ? pct(price, wk) : null, spark: hist, source: src, asOf, delayed: true } as Quote;
  });
}

/* ---------- Commodities / indices: Stooq daily CSV (delayed) ---------- */
export function parseStooq(csv: string): Bar[] {
  return csv.trim().split(/\r?\n/).slice(1).map(l => l.split(",")).filter(c => c.length >= 5 && !isNaN(+c[4]))
    .map(c => ({ t: Date.parse(c[0]), c: +c[4] }));
}
const BROWSER_UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" };
export function parseYahoo(j: any): Bar[] {
  const r = j?.chart?.result?.[0]; const ts: number[] = r?.timestamp ?? []; const cl: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
  return ts.map((t, i) => ({ t: t * 1000, c: cl[i] as number })).filter(b => b.c != null && !isNaN(b.c));
}
async function yahooBars(sym: string, qs: string): Promise<Bar[]> {
  await throttle("yahoo", 300);
  const j = await getJson<any>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&${qs}`, 8000, BROWSER_UA);
  const b = parseYahoo(j); if (!b.length) throw new Error("yahoo empty " + sym); return b;
}
/** Daily bars: Yahoo Finance first (works from cloud hosts), Stooq as fallback. */
async function dailyBars(def: AssetDef, range = "3mo"): Promise<{ bars: Bar[]; src: string }> {
  if (def.yahoo) { try { return { bars: await yahooBars(def.yahoo, `range=${range}`), src: "Yahoo Finance (daily, delayed)" }; } catch { /* fall back */ } }
  return { bars: await stooqBars(def.stooq!), src: "Stooq (daily close, delayed)" };
}
async function stooqBars(sym: string): Promise<Bar[]> {
  await throttle("stooq", 400);
  const bars = parseStooq(await getText(`https://stooq.com/q/d/l/?s=${encodeURIComponent(sym)}&i=d`));
  if (!bars.length) throw new Error("stooq empty " + sym);
  return bars.slice(-90);
}
export async function fetchStooqQuotes(): Promise<Quote[]> {
  const defs = ASSETS.filter(a => a.stooq);
  const out: Quote[] = [];
  for (const d of defs) {
    try {
      const { bars: b, src } = await dailyBars(d);
      const last = b.at(-1)!, prev = b.at(-2), wk = b.at(-6);
      out.push({ id: d.id, symbol: d.symbol, name: d.name, cls: d.cls, price: last.c, change24h: prev ? pct(last.c, prev.c) : null, change7d: wk ? pct(last.c, wk.c) : null,
        spark: b.slice(-30).map(x => x.c), source: src, asOf: new Date(last.t).toISOString(), delayed: true });
    } catch { /* skip; reported as unavailable */ }
  }
  return out;
}

/* ---------- Aggregation ---------- */
export async function getAllQuotes(): Promise<{ quotes: Quote[]; errors: string[]; stale: boolean }> {
  const errors: string[] = []; let stale = false;
  const run = async (key: string, ttl: number, fn: () => Promise<Quote[]>) => {
    try { const r = await cached(key, ttl, fn); stale ||= r.stale; return r.value; } catch (e: any) { errors.push(`${key}: ${e.message}`); return [] as Quote[]; }
  };
  const [c, f, s] = await Promise.all([run("crypto", 60_000, fetchCrypto), run("forex", 10 * 60_000, fetchForex), run("stooq", 15 * 60_000, fetchStooqQuotes)]);
  return { quotes: [...c, ...f, ...s], errors, stale };
}

/* ---------- History for charts / historical comparison ---------- */
export async function getHistory(id: string, days = 90): Promise<Bar[]> {
  const def = asset(id); if (!def) throw new Error("unknown asset");
  const r = await cached(`hist:${id}:${days}`, 30 * 60_000, async () => {
    if (def.cg) { await throttle("coingecko", 1500);
      const j = await getJson<any>(`https://api.coingecko.com/api/v3/coins/${def.cg}/market_chart?vs_currency=usd&days=${days}&interval=daily`);
      return (j.prices as [number, number][]).map(([t, c]) => ({ t, c }));
    }
    if (def.pair) { const s = await fetchFxSeries(days);
      return s.dates.map((d, i) => ({ t: Date.parse(d), c: pairPrice(def, s.rates[i]) as number })).filter(b => b.c);
    }
    if (def.stooq) return (await dailyBars(def, days > 120 ? "1y" : "6mo")).bars.slice(-days);
    throw new Error("no history provider for " + id);
  });
  return r.value;
}
/** Long-range daily history from a date (used for historical event reactions). */
export async function getHistoryRange(id: string, fromISO: string, toISO: string): Promise<Bar[]> {
  const def = asset(id); if (!def) throw new Error("unknown asset");
  const key = `range:${id}:${fromISO}:${toISO}`;
  return (await cached(key, 24 * 3600_000, async () => {
    if (def.pair) {
      const j = await getJson<any>(`https://api.frankfurter.dev/v1/${fromISO}..${toISO}?base=USD&symbols=${CCY.join(",")}`);
      return Object.keys(j.rates).sort().map(d => ({ t: Date.parse(d), c: pairPrice(def, j.rates[d]) as number })).filter(b => b.c);
    }
    if (def.yahoo) { try { return await yahooBars(def.yahoo, `period1=${Math.floor(Date.parse(fromISO) / 1000)}&period2=${Math.floor(Date.parse(toISO) / 1000)}`); } catch { /* fall back */ } }
    if (def.stooq) { await throttle("stooq", 400);
      const a = fromISO.replace(/-/g, ""), b = toISO.replace(/-/g, "");
      return parseStooq(await getText(`https://stooq.com/q/d/l/?s=${encodeURIComponent(def.stooq)}&d1=${a}&d2=${b}&i=d`));
    }
    if (def.cg) { await throttle("coingecko", 1500);
      const j = await getJson<any>(`https://api.coingecko.com/api/v3/coins/${def.cg}/market_chart/range?vs_currency=usd&from=${Date.parse(fromISO) / 1000}&to=${Date.parse(toISO) / 1000}`);
      return (j.prices as [number, number][]).map(([t, c]) => ({ t, c }));
    }
    throw new Error("no provider");
  })).value;
}
