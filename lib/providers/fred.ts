import { cached } from "../cache";
import { getJson } from "../http";

export interface FredPoint { id: string; label: string; value: number; date: string; previous?: number }
const SERIES: [string, string][] = [["DFF", "Effective Fed funds rate (%)"], ["DGS2", "US 2-year Treasury yield (%)"], ["DGS10", "US 10-year Treasury yield (%)"], ["UNRATE", "US unemployment rate (%)"], ["T10YIE", "10-year breakeven inflation (%)"]];
/** Official US macro data from FRED. Returns [] when FRED_API_KEY isn't set. Never invented. */
export async function getFred(): Promise<FredPoint[]> {
  const key = process.env.FRED_API_KEY; if (!key) return [];
  const r = await cached("fred", 6 * 3600_000, async () => (await Promise.all(SERIES.map(async ([id, label]) => {
    try {
      const j = await getJson<any>(`https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${key}&file_type=json&sort_order=desc&limit=5`);
      const obs = (j.observations ?? []).filter((o: any) => o.value !== ".");
      if (!obs.length) return null;
      return { id, label, value: Number(obs[0].value), date: obs[0].date, previous: obs[1] ? Number(obs[1].value) : undefined } as FredPoint;
    } catch { return null; }
  }))).filter(Boolean) as FredPoint[]);
  return r.value;
}
