import { getHistoryRange, type Bar } from "./quotes";

export interface FomcEvent { date: string; action: string; bps: number }
/** Real FOMC rate decisions (federal funds target changes), compiled from federalreserve.gov. Verify at the source link. */
export const FOMC_SOURCE = "https://www.federalreserve.gov/monetarypolicy/openmarket.htm";
export const FOMC: FomcEvent[] = [
  { date: "2022-03-16", action: "Hike", bps: 25 }, { date: "2022-05-04", action: "Hike", bps: 50 }, { date: "2022-06-15", action: "Hike", bps: 75 },
  { date: "2022-07-27", action: "Hike", bps: 75 }, { date: "2022-09-21", action: "Hike", bps: 75 }, { date: "2022-11-02", action: "Hike", bps: 75 },
  { date: "2022-12-14", action: "Hike", bps: 50 }, { date: "2023-02-01", action: "Hike", bps: 25 }, { date: "2023-03-22", action: "Hike", bps: 25 },
  { date: "2023-05-03", action: "Hike", bps: 25 }, { date: "2023-07-26", action: "Hike", bps: 25 }, { date: "2023-09-20", action: "Hold", bps: 0 },
  { date: "2024-01-31", action: "Hold", bps: 0 }, { date: "2024-05-01", action: "Hold", bps: 0 }, { date: "2024-07-31", action: "Hold", bps: 0 },
  { date: "2024-09-18", action: "Cut", bps: -50 }, { date: "2024-11-07", action: "Cut", bps: -25 }, { date: "2024-12-18", action: "Cut", bps: -25 },
  { date: "2025-09-17", action: "Cut", bps: -25 }, { date: "2025-10-29", action: "Cut", bps: -25 }, { date: "2025-12-10", action: "Cut", bps: -25 },
];
export interface Reaction { asset: string; day: number | null; week: number | null; note?: string }
export const HIST_ASSETS = ["EURUSD", "XAU", "SPX", "BTC"];

/** % change: prior close -> close on decision day (day) and -> close 5 sessions later (week). Daily closes only: intraday moves are not captured. */
export function reactionFromBars(bars: Bar[], dateISO: string): { day: number | null; week: number | null } {
  const t = Date.parse(dateISO); const i = bars.findIndex(b => b.t >= t - 12 * 3600e3 && b.t <= t + 12 * 3600e3);
  if (i < 1) return { day: null, week: null };
  const pc = (a: number, b: number) => ((a - b) / b) * 100;
  return { day: pc(bars[i].c, bars[i - 1].c), week: bars[i + 5] ? pc(bars[i + 5].c, bars[i - 1].c) : null };
}
export async function fomcReactions(e: FomcEvent): Promise<Reaction[]> {
  const t = Date.parse(e.date); const from = new Date(t - 8 * 864e5).toISOString().slice(0, 10), to = new Date(t + 14 * 864e5).toISOString().slice(0, 10);
  return Promise.all(HIST_ASSETS.map(async a => {
    try { const r = reactionFromBars(await getHistoryRange(a, from, to), e.date); return { asset: a, ...r, note: r.day == null ? "no data for this date" : undefined }; }
    catch { return { asset: a, day: null, week: null, note: "history unavailable from provider" }; }
  }));
}
