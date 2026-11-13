import { cached } from "../cache";
import { getJson } from "../http";
import type { CalEvent } from "../types";

/**
 * Curated OFFICIAL central-bank meeting dates. These are static data compiled from the banks' published calendars and
 * are labelled "confirm at source". Nothing here is generated or guessed at runtime; if unsure, an event is omitted.
 */
const CB: { bank: string; country: string; url: string; dates: string[]; assets: string[] }[] = [
  { bank: "FOMC (Federal Reserve)", country: "US", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm", assets: ["DXY", "XAU", "SPX", "BTC", "EURUSD"],
    dates: ["2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17", "2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09"] },
  { bank: "ECB Governing Council", country: "EU", url: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html", assets: ["EURUSD", "DAX"],
    dates: ["2026-02-05", "2026-03-19", "2026-04-30", "2026-06-11", "2026-07-23", "2026-09-10", "2026-10-29", "2026-12-17"] },
  { bank: "Bank of England MPC", country: "UK", url: "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates", assets: ["GBPUSD"],
    dates: ["2026-02-05", "2026-03-19", "2026-04-30", "2026-06-18", "2026-07-30", "2026-09-17", "2026-11-05", "2026-12-17"] },
];
export function curatedEvents(): CalEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  return CB.flatMap(b => b.dates.map(d => ({
    id: `cb-${b.country}-${d}`, date: `${d}T00:00:00Z`, title: `${b.bank} — policy decision`, country: b.country, kind: "central-bank" as const, impact: "high" as const,
    status: (d < today ? "released" : "scheduled") as "released" | "scheduled", source: "Official central-bank calendar (curated)", sourceUrl: b.url,
    note: "Date from the bank's published schedule; confirm at the official source. Time of day not shown.", assets: b.assets,
  })));
}

const CCY_COUNTRY: Record<string, string> = { USD: "US", EUR: "EU", GBP: "UK", JPY: "JP", CAD: "CA", AUD: "AU", NZD: "NZ", CHF: "CH", CNY: "CN" };
const IMP: Record<string, "low" | "medium" | "high"> = { High: "high", Medium: "medium", Low: "low" };
export function mapFactory(rows: any[], nowMs = Date.now()): CalEvent[] {
  return rows.filter(r => r.title && r.date && IMP[r.impact]).map((r, i) => {
    const t = Date.parse(r.date);
    return { id: `ff-${i}-${t}`, date: new Date(t).toISOString(), title: r.title, country: CCY_COUNTRY[r.country] ?? r.country, kind: "economic" as const, impact: IMP[r.impact],
      status: (t < nowMs ? "released" : "scheduled") as "released" | "scheduled", source: "Forex Factory weekly calendar", sourceUrl: "https://www.forexfactory.com/calendar",
      forecast: r.forecast || undefined, previous: r.previous || undefined, note: "Third-party aggregator feed; confirm with the statistics agency.", assets: [] };
  });
}
export async function fetchFactory(): Promise<CalEvent[]> {
  return mapFactory(await getJson<any[]>("https://nfs.faireconomy.media/ff_calendar_thisweek.json", 8000));
}
export async function getCalendar(): Promise<{ events: CalEvent[]; errors: string[] }> {
  const errors: string[] = []; let live: CalEvent[] = [];
  try { live = (await cached("ff", 30 * 60_000, fetchFactory)).value; } catch (e: any) { errors.push("Economic calendar feed: " + e.message); }
  return { events: [...curatedEvents(), ...live].sort((a, b) => +new Date(a.date) - +new Date(b.date)), errors };
}
