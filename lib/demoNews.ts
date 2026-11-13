import { buildArticles, groupEvents } from "./analysis/engine";
/** DEMO headlines — fictional, used only when every news source is unreachable. Clearly labelled in the UI. */
export function demoNews() {
  const now = Date.now(); const mk = (t: string, s: string, m: number, sum = "") => ({ title: t, summary: sum, source: s, url: `https://demo.invalid/${encodeURIComponent(t)}`, publishedAt: new Date(now - m * 60000).toISOString() });
  const arts = buildArticles([
    mk("[DEMO] Central bank signals rate decision next week", "Demo Wire", 20, "Illustrative item — not real news."),
    mk("[DEMO] Oil supply concerns after pipeline outage", "Demo Wire", 45, "Illustrative item — not real news."),
    mk("[DEMO] Crypto regulation bill advances in committee", "Demo Wire", 90, "Illustrative item — not real news."),
  ]);
  arts.forEach(a => (a.status = "unverified"));
  return { arts, events: groupEvents(arts) };
}
