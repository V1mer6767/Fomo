import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllNews } from "../providers/news";
import { analyzeEvent, buildArticles, groupEvents } from "../analysis/engine";
import { ASSET_IDS } from "../assets";
import type { EventGroup, Importance } from "../types";
import { AI_CONFIGURED, FAST_MODEL, callClaude } from "../ai/claude";
import { EVENT_ANALYSIS_SYSTEM } from "../ai/prompts";
import { levelRank, monitorLevel } from "./importance";
import { matchExisting } from "./match";
import { matchesPrefs, type MonitorPrefs } from "./prefs";
import { parseAnalysis } from "./validate";

const OFFICIAL = new Set(["Federal Reserve", "ECB"]);
const MAX_AI_PER_RUN = () => Math.max(0, Number(process.env.AI_MAX_ANALYSES_PER_RUN ?? 4));
const MAX_AI_PER_DAY = () => Math.max(0, Number(process.env.AI_MAX_ANALYSES_PER_DAY ?? 60));
const must = (r: { error: any }, what: string) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); };
const log = (...a: unknown[]) => console.log("[monitor]", ...a);

async function startJob(db: SupabaseClient, job: string) {
  // single-flight: skip if another run of the same job started in the last 2 minutes and hasn't finished
  const recent = await db.from("monitoring_jobs").select("id").eq("job", job).eq("status", "running").gte("started_at", new Date(Date.now() - 2 * 60_000).toISOString()).limit(1);
  if (recent.data?.length) return null;
  const r = await db.from("monitoring_jobs").insert({ job }).select("id").single(); must(r, "job start"); return r.data!.id as string;
}
async function endJob(db: SupabaseClient, id: string, status: "ok" | "error", stats: object, error?: string) {
  await db.from("monitoring_jobs").update({ finished_at: new Date().toISOString(), status, stats, error: error?.slice(0, 500) ?? null }).eq("id", id);
}

export async function runIngest(db: SupabaseClient) {
  const jobId = await startJob(db, "ingest"); if (!jobId) return { skipped: "already running" };
  const stats: Record<string, number | string> = { events: 0, newEvents: 0, articles: 0, aiAnalyses: 0, ruleAnalyses: 0, notifications: 0 };
  try {
    // 1) collect → 2) normalize → 3) dedupe → 4) group (existing engine does normalize/dedupe/cluster/categorize/assets)
    const { items, errors } = await fetchAllNews(); stats.feedErrors = errors.length;
    const cutoff = Date.now() - 2 * 864e5;
    const events: EventGroup[] = groupEvents(buildArticles(items.filter(i => +new Date(i.publishedAt) > cutoff))).slice(0, 120);
    stats.events = events.length; if (!events.length) { await endJob(db, jobId, "ok", stats); return stats; }

    // 5) match against events we already stored (so the same story never becomes two events / two alerts)
    const ex = await db.from("news_events").select("id,title,importance,notified,analyzed_at,analysis_origin").gte("last_seen", new Date(Date.now() - 4 * 864e5).toISOString()).limit(1000); must(ex, "load events");
    const existing = ex.data ?? []; const byId = new Map(existing.map(e => [e.id as string, e]));
    const used = new Set<string>(); const stored: { id: string; ev: EventGroup; level: Importance; isNew: boolean }[] = [];
    for (const ev of events) {
      const { level } = monitorLevel(ev, ev.articles.some(a => OFFICIAL.has(a.source)));
      const hit = matchExisting(ev.title, existing.filter(e => !used.has(e.id)));
      const row = { title: ev.title, category: ev.category, country: ev.country, importance: level, status: ev.status, impact_score: ev.impactScore, assets: ev.assets.filter(a => ASSET_IDS.includes(a)), source_count: ev.sources.length, last_seen: new Date().toISOString(), latest_published: ev.latest, key: ev.id };
      if (hit) { used.add(hit); must(await db.from("news_events").update(row).eq("id", hit), "update event"); stored.push({ id: hit, ev, level, isNew: false }); }
      else { const r = await db.from("news_events").insert(row).select("id").single(); must(r, "insert event"); stored.push({ id: r.data!.id, ev, level, isNew: true }); stats.newEvents = Number(stats.newEvents) + 1; }
    }

    // 6) articles + sources (verified: only real fetched items, with original links and publication times)
    const arts = stored.flatMap(s => s.ev.articles.map(a => ({ event_id: s.id, url: a.url, title: a.title, summary: a.summary?.slice(0, 1500) ?? null, source: a.source, published_at: a.publishedAt, country: a.country, category: a.category })));
    const seen = new Set<string>(); const artRows = arts.filter(a => !seen.has(a.url) && seen.add(a.url));
    for (let i = 0; i < artRows.length; i += 200) must(await db.from("news_articles").upsert(artRows.slice(i, i + 200), { onConflict: "url" }), "articles");
    stats.articles = artRows.length;
    const srcRows = artRows.map(a => ({ event_id: a.event_id, source: a.source, url: a.url, title: a.title, published_at: a.published_at }));
    for (let i = 0; i < srcRows.length; i += 200) must(await db.from("event_sources").upsert(srcRows.slice(i, i + 200), { onConflict: "event_id,url" }), "sources");

    // 7) asset relationships from the rule engine (never overwrite AI-derived ones) + 8) AI analysis for important events only
    const important = stored.filter(s => levelRank(s.level) >= levelRank("high"));
    const aiToday = await db.from("ai_event_analyses").select("event_id", { count: "exact", head: true }).eq("model", FAST_MODEL()).gte("created_at", new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString());
    let aiBudget = Math.min(MAX_AI_PER_RUN(), Math.max(0, MAX_AI_PER_DAY() - (aiToday.count ?? 0)));
    for (const s of important) {
      const prev = byId.get(s.id); if (prev?.analysis_origin === "ai") continue;
      const rules = analyzeEvent(s.ev);
      let done = false;
      if (AI_CONFIGURED() && aiBudget > 0) {
        try {
          aiBudget--;
          const text = s.ev.articles.slice(0, 5).map((a, i) => `(${i + 1}) ${a.source} · ${a.publishedAt}\n${a.title}\n${(a.summary || "").slice(0, 400)}`).join("\n\n");
          const out = await callClaude({ model: FAST_MODEL(), system: EVENT_ANALYSIS_SYSTEM, maxTokens: 1200, temperature: 0.2,
            messages: [{ role: "user", content: `Allowed assets: ${ASSET_IDS.join(", ")}\nEvent status per sources: ${s.ev.status}; sources: ${s.ev.sources.join(", ")}\n<event_data>\n${text}\n</event_data>` }] });
          const a = parseAnalysis(out.text);
          if (a) {
            must(await db.from("ai_event_analyses").upsert({ event_id: s.id, model: FAST_MODEL(), analysis: { ...a, usage: out.usage, evidence: s.ev.articles.slice(0, 5).map(x => ({ source: x.source, url: x.url, publishedAt: x.publishedAt })) } }), "ai analysis");
            const evidence = s.ev.articles.slice(0, 3).map(x => ({ source: x.source, url: x.url }));
            if (a.assets.length) must(await db.from("event_asset_relationships").upsert(a.assets.map(x => ({ event_id: s.id, asset_id: x.asset, directness: x.directness, impact: x.impact, reasoning: x.reasoning, evidence, confidence: x.confidence, origin: "ai" })), { onConflict: "event_id,asset_id" }), "ai relationships");
            await db.from("news_events").update({ analyzed_at: new Date().toISOString(), analysis_origin: "ai" }).eq("id", s.id);
            stats.aiAnalyses = Number(stats.aiAnalyses) + 1; done = true;
          } else log("AI returned unparsable analysis for", s.id);
        } catch (e: any) { log("AI analysis failed:", e.message); }
      }
      if (!done && !prev?.analyzed_at) {
        const conf = s.ev.status === "confirmed" ? 0.5 : s.ev.status === "developing" ? 0.35 : 0.2;
        const evidence = s.ev.articles.slice(0, 3).map(x => ({ source: x.source, url: x.url }));
        if (rules.impacts.length) must(await db.from("event_asset_relationships").upsert(rules.impacts.slice(0, 10).map(i => ({ event_id: s.id, asset_id: i.asset, directness: i.directness, impact: i.direction, reasoning: i.mechanism, evidence, confidence: conf, origin: "rules" })), { onConflict: "event_id,asset_id", ignoreDuplicates: true }), "rule relationships");
        must(await db.from("ai_event_analyses").upsert({ event_id: s.id, model: "rules", analysis: { what: rules.sections.what, confirmed: [], unconfirmed: [], assets: [], scenarios: rules.scenarios.map(x => ({ name: x.name, description: x.description })), contradicts: rules.impacts.slice(0, 3).map(i => i.alternative), monitor: rules.sections.watch, rules: rules.sections } }, { ignoreDuplicates: true, onConflict: "event_id" }), "rules analysis");
        await db.from("news_events").update({ analyzed_at: new Date().toISOString(), analysis_origin: "rules" }).eq("id", s.id);
        stats.ruleAnalyses = Number(stats.ruleAnalyses) + 1;
      }
    }

    // 9) personalised in-app notifications — once per event per user (unique constraint), only for fresh, medium+ events
    const fresh = stored.filter(s => !byId.get(s.id)?.notified && levelRank(s.level) >= levelRank("medium") && Date.now() - +new Date(s.ev.latest) < 12 * 3600_000);
    if (fresh.length) {
      const pr = await db.from("user_monitoring_preferences").select("user_id,enabled,in_app,min_importance,assets,categories,countries").eq("enabled", true).eq("in_app", true); must(pr, "prefs");
      const rows: object[] = [];
      for (const p of pr.data ?? []) for (const s of fresh) {
        if (!matchesPrefs(p as MonitorPrefs, { level: s.level, category: s.ev.category, country: s.ev.country, assets: s.ev.assets })) continue;
        rows.push({ user_id: p.user_id, event_id: s.id, title: s.ev.title.slice(0, 300), body: `${s.level.toUpperCase()} · ${s.ev.status} · ${s.ev.sources.length} source(s)${s.ev.assets.length ? " · " + s.ev.assets.slice(0, 5).join(", ") : ""}`, importance: s.level, assets: s.ev.assets.slice(0, 8) });
      }
      for (let i = 0; i < rows.length; i += 200) must(await db.from("user_notifications").upsert(rows.slice(i, i + 200), { onConflict: "user_id,event_id", ignoreDuplicates: true }), "notifications");
      stats.notifications = rows.length;
    }
    const toMark = stored.filter(s => levelRank(s.level) >= levelRank("medium") && !byId.get(s.id)?.notified).map(s => s.id);
    if (toMark.length) must(await db.from("news_events").update({ notified: true }).in("id", toMark), "mark notified");

    await endJob(db, jobId, "ok", stats); log("ingest ok", stats); return stats;
  } catch (e: any) { log("ingest failed:", e.message); await endJob(db, jobId, "error", stats, e.message); throw e; }
}
