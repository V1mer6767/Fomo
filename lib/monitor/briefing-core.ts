import { levelRank } from "./importance";

export interface BriefingEvent { id: string; title: string; level: string; category: string; country: string | null; status: string; sources: number; assets: string[]; link: string | null; published: string | null }
export interface BriefingContent {
  day: string; generatedAt: string; summary: string; summaryBy: "ai" | "rules";
  top: BriefingEvent[]; geopolitics: BriefingEvent[]; crypto: BriefingEvent[]; forex: BriefingEvent[];
  upcoming: { date: string; title: string; country: string; impact: string; status: string; source: string }[];
  affectedAssets: { asset: string; mentions: number }[]; uncertainties: string[]; yourAssets?: BriefingEvent[];
}
const GEO = new Set(["politics", "elections", "wars", "trade", "regulation"]);
const FX = new Set(["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD", "DXY"]);
const CRYPTO = new Set(["BTC", "ETH", "SOL", "XRP", "BNB", "ADA", "DOGE", "AVAX", "TON", "LINK"]);

export function buildBriefing(rows: any[], links: Map<string, { url: string; published: string }>, cal: any[], day: string): Omit<BriefingContent, "summary" | "summaryBy"> {
  const ev = (r: any): BriefingEvent => ({ id: r.id, title: r.title, level: r.importance, category: r.category, country: r.country, status: r.status, sources: r.source_count, assets: r.assets ?? [], link: links.get(r.id)?.url ?? null, published: links.get(r.id)?.published ?? r.latest_published });
  const sorted = [...rows].sort((a, b) => levelRank(b.importance) - levelRank(a.importance) || b.impact_score - a.impact_score);
  const top = sorted.slice(0, 8).map(ev);
  const counts = new Map<string, number>(); sorted.slice(0, 30).forEach(r => (r.assets ?? []).forEach((a: string) => counts.set(a, (counts.get(a) ?? 0) + 1)));
  return { day, generatedAt: new Date().toISOString(), top,
    geopolitics: sorted.filter(r => GEO.has(r.category)).slice(0, 5).map(ev),
    crypto: sorted.filter(r => r.category === "crypto" || (r.assets ?? []).some((a: string) => CRYPTO.has(a))).slice(0, 5).map(ev),
    forex: sorted.filter(r => r.category === "central-banks" || (r.assets ?? []).some((a: string) => FX.has(a))).slice(0, 5).map(ev),
    upcoming: cal.map(e => ({ date: e.date, title: e.title, country: e.country, impact: e.impact, status: e.status, source: e.source })),
    affectedAssets: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([asset, mentions]) => ({ asset, mentions })),
    uncertainties: sorted.filter(r => r.status !== "confirmed").slice(0, 4).map(r => `Not yet confirmed (${r.status}, ${r.source_count} source${r.source_count === 1 ? "" : "s"}): ${r.title}`) };
}
export function rulesSummary(b: Omit<BriefingContent, "summary" | "summaryBy">): string {
  if (!b.top.length) return "No significant developments were detected in the last 24 hours.";
  const parts = [`${b.top.length} notable development(s) in the last 24h. Most important: ${b.top[0].title} (${b.top[0].level}, ${b.top[0].status}).`];
  if (b.geopolitics.length) parts.push(`Geopolitics/policy: ${b.geopolitics.slice(0, 2).map(e => e.title).join("; ")}.`);
  if (b.upcoming.length) parts.push(`Coming up: ${b.upcoming.slice(0, 3).map(e => `${e.title} (${e.date.slice(0, 10)})`).join("; ")}.`);
  if (b.affectedAssets.length) parts.push(`Assets most often linked: ${b.affectedAssets.slice(0, 5).map(a => a.asset).join(", ")} — links are potential, not proven.`);
  if (b.uncertainties.length) parts.push(`Key uncertainty: ${b.uncertainties[0]}`);
  return parts.join(" ");
}

