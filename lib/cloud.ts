import type { SupabaseClient } from "@supabase/supabase-js";
import { analysisToRow, listToRows, logToRow, newsToRow, portfolioFromRows, portfolioToRows, removedKeys, rowToAnalysis, rowToLog, rowToNews, rowToRule, ruleToRow, validAsset } from "./cloud-map";
import { PREFS0, type Prefs } from "./userdata";

export interface CloudAdapter { keys: string[]; load(key: string): Promise<unknown | undefined>; save(key: string, value: any): Promise<void> }
export const CLOUD_KEYS = ["theme", "prefs", "watchlist", "favorites", "portfolio", "alertRules", "alertLog", "savedNews", "savedAnalyses"];
const ok = (r: { error: any }, what: string) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); };

/** Persists app state in Supabase tables. All access goes through the user's session; Row Level Security enforces ownership. */
export function createAdapter(sb: SupabaseClient, uid: string): CloudAdapter {
  const known = new Map<string, Set<string>>();       // key -> identifiers of rows currently stored
  let portfolioId: string | null = null;

  async function ensurePortfolio(): Promise<string> {
    if (portfolioId) return portfolioId;
    let r = await sb.from("virtual_portfolios").select("id").eq("user_id", uid).maybeSingle(); ok(r, "portfolio");
    if (!r.data) { r = await sb.from("virtual_portfolios").insert({ user_id: uid }).select("id").single(); ok(r, "portfolio create"); }
    return (portfolioId = r.data!.id as string);
  }
  const listKind = (key: string) => (key === "favorites" ? "favorite" : "watch") as "watch" | "favorite";

  return {
    keys: CLOUD_KEYS,
    async load(key) {
      switch (key) {
        case "theme": { const r = await sb.from("user_preferences").select("theme").eq("user_id", uid).maybeSingle(); ok(r, key); return r.data?.theme; }
        case "prefs": { const r = await sb.from("user_preferences").select("default_asset,news_sort").eq("user_id", uid).maybeSingle(); ok(r, key);
          return r.data ? { defaultAsset: r.data.default_asset, newsSort: r.data.news_sort } as Prefs : undefined; }
        case "watchlist": case "favorites": { const r = await sb.from("watchlists").select("asset_id").eq("user_id", uid).eq("kind", listKind(key)).order("position"); ok(r, key);
          const ids = (r.data ?? []).map(x => x.asset_id as string); known.set(key, new Set(ids)); return ids; }
        case "savedNews": { const r = await sb.from("saved_news").select("*").eq("user_id", uid).order("saved_at", { ascending: false }).limit(200); ok(r, key); known.set(key, new Set((r.data ?? []).map(x => x.event_id))); return (r.data ?? []).map(rowToNews); }
        case "savedAnalyses": { const r = await sb.from("saved_analyses").select("*").eq("user_id", uid).order("saved_at", { ascending: false }).limit(100); ok(r, key); known.set(key, new Set((r.data ?? []).map(x => x.event_id))); return (r.data ?? []).map(rowToAnalysis); }
        case "alertRules": { const r = await sb.from("user_alerts").select("*").eq("user_id", uid).order("created_at"); ok(r, key); known.set(key, new Set((r.data ?? []).map(x => x.id))); return (r.data ?? []).map(rowToRule); }
        case "alertLog": { const r = await sb.from("alert_log").select("*").eq("user_id", uid).order("at", { ascending: false }).limit(100); ok(r, key); known.set(key, new Set((r.data ?? []).map(x => x.id))); return (r.data ?? []).map(rowToLog); }
        case "portfolio": {
          const id = await ensurePortfolio();
          const [pf, a, t, h] = await Promise.all([
            sb.from("virtual_portfolios").select("*").eq("id", id).single(),
            sb.from("portfolio_assets").select("*").eq("portfolio_id", id),
            sb.from("portfolio_trades").select("*").eq("portfolio_id", id).order("executed_at", { ascending: false }).limit(200),
            sb.from("portfolio_history").select("*").eq("portfolio_id", id).order("t", { ascending: true }).limit(500)]);
          ok(pf, "portfolio"); ok(a, "assets"); ok(t, "trades"); ok(h, "history");
          known.set("pf:assets", new Set((a.data ?? []).map(x => x.asset_id))); known.set("pf:trades", new Set((t.data ?? []).map(x => new Date(x.executed_at).toISOString())));
          known.set("pf:history", new Set((h.data ?? []).map(x => new Date(x.t).toISOString())));
          return portfolioFromRows(pf.data, a.data ?? [], t.data ?? [], h.data ?? []);
        }
      }
      return undefined;
    },
    async save(key, value) {
      switch (key) {
        case "theme": if (value === "dark" || value === "light") ok(await sb.from("user_preferences").upsert({ user_id: uid, theme: value }, { onConflict: "user_id" }), key); return;
        case "prefs": { const p = { ...PREFS0, ...(value ?? {}) } as Prefs; if (!validAsset(p.defaultAsset) || !["new", "impact"].includes(p.newsSort)) return;
          ok(await sb.from("user_preferences").upsert({ user_id: uid, default_asset: p.defaultAsset, news_sort: p.newsSort }, { onConflict: "user_id" }), key); return; }
        case "watchlist": case "favorites": {
          const kind = listKind(key); const rows = listToRows(uid, kind, value as string[]); const gone = removedKeys(known.get(key) ?? [], rows.map(r => r.asset_id));
          if (gone.length) ok(await sb.from("watchlists").delete().eq("user_id", uid).eq("kind", kind).in("asset_id", gone), key);
          if (rows.length) ok(await sb.from("watchlists").upsert(rows, { onConflict: "user_id,asset_id,kind" }), key);
          known.set(key, new Set(rows.map(r => r.asset_id))); return; }
        case "savedNews": case "savedAnalyses": {
          const table = key === "savedNews" ? "saved_news" : "saved_analyses"; const map = key === "savedNews" ? newsToRow : analysisToRow;
          const rows = (value as any[]).map(v => map(uid, v)).filter(Boolean) as any[]; const gone = removedKeys(known.get(key) ?? [], rows.map(r => r.event_id));
          if (gone.length) ok(await sb.from(table).delete().eq("user_id", uid).in("event_id", gone), key);
          if (rows.length) ok(await sb.from(table).upsert(rows, { onConflict: "user_id,event_id" }), key);
          known.set(key, new Set(rows.map(r => r.event_id))); return; }
        case "alertRules": {
          const rows = (value as any[]).map(r => ruleToRow(uid, r)).filter(Boolean) as any[]; const gone = removedKeys(known.get(key) ?? [], rows.map(r => r.id));
          if (gone.length) ok(await sb.from("user_alerts").delete().eq("user_id", uid).in("id", gone), key);
          if (rows.length) ok(await sb.from("user_alerts").upsert(rows, { onConflict: "user_id,id" }), key);
          known.set(key, new Set(rows.map(r => r.id))); return; }
        case "alertLog": {
          const rows = (value as any[]).map(l => logToRow(uid, l)).filter(Boolean) as any[]; const gone = removedKeys(known.get(key) ?? [], rows.map(r => r.id));
          if (gone.length) ok(await sb.from("alert_log").delete().eq("user_id", uid).in("id", gone), key);
          const fresh = rows.filter(r => !(known.get(key) ?? new Set()).has(r.id));
          if (fresh.length) ok(await sb.from("alert_log").upsert(fresh, { onConflict: "user_id,id" }), key);
          known.set(key, new Set(rows.map(r => r.id))); return; }
        case "portfolio": {
          const id = await ensurePortfolio(); const rows = portfolioToRows(uid, id, value);
          ok(await sb.from("virtual_portfolios").update({ cash: rows.header.cash, start_cash: rows.header.start_cash }).eq("id", id), "portfolio");
          const goneA = removedKeys(known.get("pf:assets") ?? [], rows.assets.map(a => a.asset_id));
          if (goneA.length) ok(await sb.from("portfolio_assets").delete().eq("portfolio_id", id).in("asset_id", goneA), "assets");
          if (rows.assets.length) ok(await sb.from("portfolio_assets").upsert(rows.assets, { onConflict: "portfolio_id,asset_id" }), "assets");
          known.set("pf:assets", new Set(rows.assets.map(a => a.asset_id)));
          const goneT = removedKeys(known.get("pf:trades") ?? [], rows.trades.map(t => t.executed_at));
          if (goneT.length) ok(await sb.from("portfolio_trades").delete().eq("portfolio_id", id).in("executed_at", goneT), "trades");
          const prevT = known.get("pf:trades") ?? new Set<string>(); const newT = rows.trades.filter(t => !prevT.has(t.executed_at));
          if (newT.length) ok(await sb.from("portfolio_trades").insert(newT), "trades");
          known.set("pf:trades", new Set(rows.trades.map(t => t.executed_at)));
          const goneH = removedKeys(known.get("pf:history") ?? [], rows.history.map(h => h.t));
          if (goneH.length) ok(await sb.from("portfolio_history").delete().eq("portfolio_id", id).in("t", goneH), "history");
          const prevH = known.get("pf:history") ?? new Set<string>(); const newH = rows.history.filter(h => !prevH.has(h.t));
          if (newH.length) ok(await sb.from("portfolio_history").upsert(newH, { onConflict: "portfolio_id,t" }), "history");
          known.set("pf:history", new Set(rows.history.map(h => h.t))); return; }
      }
    },
  };
}
