import { ASSETS } from "../assets";
import { tokens, assetsFor } from "../analysis/engine";
import { getAllQuotes } from "../providers/quotes";
import { getCalendar } from "../providers/calendar";
import { getFred } from "../providers/fred";
import { getNewsEvents, type EventWithAnalysis } from "../providers/newsFeed";

export interface Source { n: number; title: string; url: string; source: string; publishedAt: string; status?: string }
export interface Retrieved { text: string; sources: Source[]; asOf: string; assets: string[]; events: EventWithAnalysis[]; demo: boolean; notes: string[] }

/** Which assets does the question talk about? (aliases first, then the rule engine's keyword mapping). */
export function detectAssets(q: string): string[] {
  const low = ` ${q.toLowerCase()} `; const found = new Set<string>();
  for (const a of ASSETS) {
    const names = [a.symbol, a.name, ...a.aliases].map(s => s.toLowerCase()).filter(s => s.length > 1);
    if (names.some(n => new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&")}([^a-z0-9]|$)`).test(low))) found.add(a.id);
  }
  if (!found.size) assetsFor(q).slice(0, 4).forEach(i => found.add(i.asset));
  return [...found].slice(0, 6);
}
export function scoreEvent(ev: EventWithAnalysis, qTokens: Set<string>, assets: string[]): number {
  const t = new Set(tokens(ev.title + " " + ev.articles.slice(0, 3).map(a => a.title).join(" ")));
  let overlap = 0; qTokens.forEach(w => t.has(w) && overlap++);
  const assetHit = ev.assets.filter(a => assets.includes(a)).length;
  const ageH = (Date.now() - +new Date(ev.latest)) / 36e5;
  return overlap * 3 + assetHit * 2 + ev.impactScore / 40 + Math.max(0, 3 - ageH / 12);
}
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export async function retrieve(question: string): Promise<Retrieved> {
  const notes: string[] = []; const assets = detectAssets(question); const qT = new Set(tokens(question));
  const [qs, news, cal, fred] = await Promise.all([
    getAllQuotes().catch(() => { notes.push("Quotes unavailable"); return { quotes: [], errors: [], stale: false }; }),
    getNewsEvents().catch(() => { notes.push("News unavailable"); return null; }),
    getCalendar().catch(() => ({ events: [], errors: [] })),
    getFred().catch(() => []),
  ]);
  const quotes = qs.quotes.filter(q => assets.includes(q.id));
  const demo = !!news?.demo || quotes.some(q => q.demo);
  const events = (news?.events ?? []).map(ev => ({ ev, s: scoreEvent(ev, qT, assets) })).sort((a, b) => b.s - a.s).slice(0, 6).map(x => x.ev);
  const sources: Source[] = []; const lines: string[] = [];
  for (const ev of events) {
    for (const a of ev.articles.slice(0, 2)) {
      const n = sources.length + 1; sources.push({ n, title: a.title, url: a.url, source: a.source, publishedAt: a.publishedAt, status: ev.status });
      lines.push(`[S${n}] ${a.source} · ${a.publishedAt} · event status: ${ev.status} (${ev.sources.length} source(s)) · category: ${ev.category}\n    headline: ${clip(a.title, 200)}\n    summary: ${clip(a.summary || "", 320)}`);
    }
  }
  const now = Date.now();
  const upcoming = cal.events.filter(e => +new Date(e.date) >= now - 864e5 && +new Date(e.date) <= now + 14 * 864e5 && (e.impact !== "low" || (e.assets ?? []).some(a => assets.includes(a)))).slice(0, 6);
  const asOf = new Date().toISOString();
  const text = [
    `as_of: ${asOf}${demo ? "  (WARNING: part of this data is DEMO data)" : ""}`,
    `assets_in_question: ${assets.join(", ") || "none detected"}`,
    `quotes:`, ...(quotes.length ? quotes.map(q => `  ${q.id} ${q.name}: price=${q.price ?? "n/a"} 24h=${q.change24h?.toFixed?.(2) ?? "n/a"}% 7d=${q.change7d?.toFixed?.(2) ?? "n/a"}% source=${q.source} as_of=${q.asOf}${q.delayed ? " (delayed)" : ""}${q.demo ? " (DEMO)" : ""}`) : ["  none available"]),
    `news:`, ...(lines.length ? lines : ["  no matching news found"]),
    `upcoming_calendar:`, ...(upcoming.length ? upcoming.map(e => `  ${e.date.slice(0, 10)} ${e.country} ${e.title} (impact ${e.impact}, ${e.status})${e.forecast ? ` forecast=${e.forecast}` : ""}${e.previous ? ` previous=${e.previous}` : ""} source=${e.source}`) : ["  none"]),
    ...(fred.length ? [`fred_macro:`, ...fred.map(f => `  ${f.label}: ${f.value} (${f.date})${f.previous != null ? ` prev ${f.previous}` : ""}`)] : []),
    ...(notes.length ? [`retrieval_notes: ${notes.join("; ")}`] : []),
  ].join("\n");
  return { text, sources, asOf, assets, events, demo, notes };
}

/** Honest fallback used when no Claude key is configured: summarises what was retrieved, using the rule engine. No made-up content. */
export function fallbackAnswer(r: Retrieved): string {
  const out: string[] = [`**AI model not configured** — showing a rule-based summary of the latest retrieved data (as of ${r.asOf.slice(0, 16).replace("T", " ")} UTC).`, ""];
  if (!r.events.length) return out.concat("No matching news found right now. Try naming an asset (e.g. Bitcoin, EUR/USD) or an event.").join("\n");
  r.events.slice(0, 3).forEach(ev => {
    const first = r.sources.find(s => ev.articles.some(a => a.url === s.url));
    out.push(`### ${ev.title} ${first ? `[S${first.n}]` : ""}`, `Status: **${ev.status}** · ${ev.sources.length} source(s) · category: ${ev.category}`);
    ev.analysis.impacts.slice(0, 3).forEach(i => out.push(`- **${i.asset}** (${i.directness}, ${i.direction}): ${i.mechanism} *Could differ if:* ${i.alternative}`));
    out.push("");
  });
  out.push("_Scenarios are possible mechanisms, not predictions. Correlation is not causation._");
  return out.join("\n");
}
