import { ASSET_IDS } from "../assets";

export type Impact = "positive" | "negative" | "mixed" | "uncertain" | "none";
export interface AiAnalysis {
  what: string; confirmed: string[]; unconfirmed: string[];
  assets: { asset: string; directness: "direct" | "indirect"; impact: Impact; reasoning: string; confidence: number }[];
  scenarios: { name: string; description: string }[]; contradicts: string[]; monitor: string[];
}
const IMPACTS = new Set(["positive", "negative", "mixed", "uncertain", "none"]);
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n) : "");
const strs = (v: unknown, n = 6, len = 300) => (Array.isArray(v) ? v.map(x => clip(x, len)).filter(Boolean).slice(0, n) : []);

/** Extract and strictly validate the model's JSON. Anything unexpected is dropped (unknown assets, bad enums, out-of-range confidence). */
export function parseAnalysis(raw: string): AiAnalysis | null {
  const s = raw.indexOf("{"), e = raw.lastIndexOf("}"); if (s < 0 || e <= s) return null;
  let j: any; try { j = JSON.parse(raw.slice(s, e + 1)); } catch { return null; }
  const what = clip(j.what, 600); if (!what) return null;
  const seen = new Set<string>();
  const assets = (Array.isArray(j.assets) ? j.assets : []).flatMap((a: any) => {
    const id = String(a?.asset ?? ""); if (!ASSET_IDS.includes(id) || seen.has(id)) return []; seen.add(id);
    const impact = IMPACTS.has(a.impact) ? a.impact : "uncertain"; const c = Number(a.confidence);
    return [{ asset: id, directness: a.directness === "direct" ? "direct" : "indirect", impact, reasoning: clip(a.reasoning, 500) || "No reasoning provided.", confidence: Number.isFinite(c) ? Math.min(1, Math.max(0, Math.round(c * 100) / 100)) : 0.3 }];
  }).slice(0, 12);
  return { what, confirmed: strs(j.confirmed), unconfirmed: strs(j.unconfirmed), assets,
    scenarios: (Array.isArray(j.scenarios) ? j.scenarios : []).map((x: any) => ({ name: clip(x?.name, 80), description: clip(x?.description, 400) })).filter((x: any) => x.name && x.description).slice(0, 4),
    contradicts: strs(j.contradicts, 5), monitor: strs(j.monitor, 6) };
}
