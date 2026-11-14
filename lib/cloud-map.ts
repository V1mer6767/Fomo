import type { AlertLog, AlertRule, Portfolio, SavedAnalysis, SavedNews } from "./userdata";

/** Pure row <-> app-object mappers (validated/clamped). Kept free of any network code so they can be unit-tested. */
const ASSET_RE = /^[A-Za-z0-9._-]{1,20}$/;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : undefined);
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
const iso = (v: unknown) => { const t = typeof v === "string" || typeof v === "number" ? new Date(v) : null; return t && !isNaN(+t) ? t.toISOString() : undefined; };
export const validAsset = (v: unknown): v is string => typeof v === "string" && ASSET_RE.test(v);
export const KINDS = ["price-above", "price-below", "move-24h", "news-keyword", "high-importance"] as const;

export const listToRows = (uid: string, kind: "watch" | "favorite", ids: string[]) =>
  [...new Set(ids.filter(validAsset))].map((asset_id, position) => ({ user_id: uid, asset_id, kind, position }));

export function ruleToRow(uid: string, r: AlertRule) {
  if (!r?.id || !(KINDS as readonly string[]).includes(r.kind)) return null;
  const asset_id = r.asset && validAsset(r.asset) ? r.asset : null;
  return { id: String(r.id).slice(0, 64), user_id: uid, kind: r.kind, asset_id, value: r.value != null ? num(r.value) ?? null : null, keyword: clip(r.keyword, 100) ?? null, enabled: !!r.enabled, fired: !!r.fired };
}
export const rowToRule = (r: any): AlertRule => ({ id: r.id, kind: r.kind, asset: r.asset_id ?? undefined, value: r.value != null ? Number(r.value) : undefined, keyword: r.keyword ?? undefined, enabled: !!r.enabled, fired: !!r.fired });

export const logToRow = (uid: string, l: AlertLog) => l?.id && l.text ? { id: String(l.id).slice(0, 80), user_id: uid, text: l.text.slice(0, 500), link: clip(l.link, 300) ?? null, at: iso(l.at) ?? new Date().toISOString() } : null;
export const rowToLog = (r: any): AlertLog => ({ id: r.id, text: r.text, link: r.link ?? undefined, at: new Date(r.at).toISOString() });

export const newsToRow = (uid: string, n: SavedNews) => n?.eventId && n.title ? { user_id: uid, event_id: n.eventId.slice(0, 64), title: n.title.slice(0, 500), url: clip(n.url, 2000) ?? null, source: clip(n.source, 200) ?? null, summary: clip(n.summary, 2000) ?? null, category: clip(n.category, 40) ?? null, published_at: iso(n.publishedAt) ?? null, saved_at: iso(n.savedAt) ?? new Date().toISOString() } : null;
export const rowToNews = (r: any): SavedNews => ({ eventId: r.event_id, title: r.title, url: r.url ?? undefined, source: r.source ?? undefined, summary: r.summary ?? undefined, category: r.category ?? undefined, publishedAt: r.published_at ?? undefined, savedAt: new Date(r.saved_at).toISOString() });

export const analysisToRow = (uid: string, a: SavedAnalysis) => a?.eventId && a.title && a.analysis && JSON.stringify(a.analysis).length < 90_000 ? { user_id: uid, event_id: a.eventId.slice(0, 64), title: a.title.slice(0, 500), analysis: a.analysis, saved_at: iso(a.savedAt) ?? new Date().toISOString() } : null;
export const rowToAnalysis = (r: any): SavedAnalysis => ({ eventId: r.event_id, title: r.title, analysis: r.analysis, savedAt: new Date(r.saved_at).toISOString() });

export function portfolioToRows(uid: string, portfolioId: string, p: Portfolio) {
  const assets = p.positions.filter(x => validAsset(x.asset) && x.qty > 0 && Number.isFinite(x.qty) && Number.isFinite(x.avg) && x.avg >= 0).map(x => ({ portfolio_id: portfolioId, user_id: uid, asset_id: x.asset, qty: x.qty, avg_price: x.avg }));
  const trades = p.trades.filter(t => validAsset(t.asset) && (t.side === "buy" || t.side === "sell") && t.qty > 0 && Number.isFinite(t.price) && iso(t.at)).map(t => ({ portfolio_id: portfolioId, user_id: uid, asset_id: t.asset, side: t.side, qty: t.qty, price: t.price, executed_at: iso(t.at)! }));
  const history = p.equity.filter(e => Number.isFinite(e.v) && Number.isFinite(e.t)).map(e => ({ portfolio_id: portfolioId, user_id: uid, t: new Date(e.t).toISOString(), value: Math.round(e.v * 100) / 100 }));
  const cash = Math.max(0, Math.round(p.cash * 100) / 100); const start_cash = p.start > 0 ? Math.round(p.start * 100) / 100 : 100000;
  return { header: { user_id: uid, cash, start_cash }, assets, trades, history };
}
export function portfolioFromRows(pf: any, assets: any[], trades: any[], hist: any[]): Portfolio {
  return { cash: Number(pf.cash), start: Number(pf.start_cash), positions: assets.map(a => ({ asset: a.asset_id, qty: Number(a.qty), avg: Number(a.avg_price) })),
    trades: trades.map(t => ({ at: new Date(t.executed_at).toISOString(), asset: t.asset_id, side: t.side, qty: Number(t.qty), price: Number(t.price) })),
    equity: hist.map(h => ({ t: +new Date(h.t), v: Number(h.value) })) };
}
/** Keys present before but absent now — rows to delete. */
export const removedKeys = (prev: Iterable<string>, next: Iterable<string>) => { const n = new Set(next); return [...prev].filter(k => !n.has(k)); };
