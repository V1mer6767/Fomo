import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCalendar } from "../providers/calendar";
import { getAllQuotes } from "../providers/quotes";
import { AI_CONFIGURED, FAST_MODEL, callClaude } from "../ai/claude";
import { BRIEFING_SYSTEM } from "../ai/prompts";

export { buildBriefing, rulesSummary } from "./briefing-core";
import { buildBriefing, rulesSummary, type BriefingContent } from "./briefing-core";
export type { BriefingContent, BriefingEvent } from "./briefing-core";

export async function runBriefing(db: SupabaseClient) {
  const day = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const ev = await db.from("news_events").select("id,title,importance,category,country,status,impact_score,assets,source_count,latest_published").gte("last_seen", since).order("impact_score", { ascending: false }).limit(150);
  if (ev.error) throw new Error(ev.error.message);
  const ids = (ev.data ?? []).map(r => r.id);
  const src = ids.length ? await db.from("event_sources").select("event_id,url,published_at").in("event_id", ids).order("published_at", { ascending: false }) : { data: [] as any[] };
  const links = new Map<string, { url: string; published: string }>(); (src.data ?? []).forEach((s: any) => links.has(s.event_id) || links.set(s.event_id, { url: s.url, published: s.published_at }));
  const cal = (await getCalendar().catch(() => ({ events: [] }))).events.filter(e => { const t = +new Date(e.date); return t >= Date.now() - 36e5 && t <= Date.now() + 7 * 864e5 && e.impact !== "low"; }).slice(0, 8);
  const base = buildBriefing(ev.data ?? [], links, cal, day);
  let summary = rulesSummary(base); let summaryBy: "ai" | "rules" = "rules";
  if (AI_CONFIGURED() && base.top.length) {
    try { const q = await getAllQuotes().catch(() => null); const quotes = (q?.quotes ?? []).filter(x => ["BTC", "ETH", "EURUSD", "XAU", "SPX"].includes(x.id)).map(x => `${x.id}: ${x.price} (24h ${x.change24h?.toFixed?.(2)}%) as_of ${x.asOf}`);
      const out = await callClaude({ model: FAST_MODEL(), system: BRIEFING_SYSTEM, maxTokens: 700, temperature: 0.2, messages: [{ role: "user", content: `<briefing_data>\n${JSON.stringify({ ...base, quotes })}\n</briefing_data>` }] });
      if (out.text.trim()) { summary = out.text.trim().slice(0, 3000); summaryBy = "ai"; } } catch (e: any) { console.error("[briefing] AI failed:", e.message); }
  }
  const content: BriefingContent = { ...base, summary, summaryBy };
  const pr = await db.from("user_monitoring_preferences").select("user_id,assets").eq("briefing", true).eq("enabled", true);
  if (pr.error) throw new Error(pr.error.message);
  const rows = (pr.data ?? []).map(p => ({ user_id: p.user_id, day, content: { ...content, yourAssets: p.assets?.length ? base.top.concat(base.crypto, base.forex).filter((e, i, a) => a.findIndex(x => x.id === e.id) === i && e.assets.some(x => p.assets.includes(x))).slice(0, 6) : undefined } }));
  for (let i = 0; i < rows.length; i += 100) { const r = await db.from("daily_briefings").upsert(rows.slice(i, i + 100), { onConflict: "user_id,day" }); if (r.error) throw new Error(r.error.message); }
  return { day, users: rows.length, events: base.top.length, summaryBy };
}
