import { fetchAllNews } from "./news";
import { buildArticles, groupEvents, rulesProvider } from "../analysis/engine";
import { cached } from "../cache";
import { demoNews } from "../demoNews";
import type { Article, EventGroup, Analysis } from "../types";

export type EventWithAnalysis = EventGroup & { analysis: Analysis };
/** Shared, cached live-news pipeline (used by /api/news, the AI analyst and the monitor). */
export async function getNewsEvents(maxAgeDays = 3) {
  const r = await cached("news:built", 2 * 60_000, async () => {
    const { items, errors } = await fetchAllNews();
    const cutoff = Date.now() - maxAgeDays * 864e5;
    const arts = buildArticles(items.filter(i => +new Date(i.publishedAt) > cutoff));
    return { arts, events: groupEvents(arts), errors };
  });
  let { arts, events } = r.value; let demo = false;
  if (!arts.length) { const d = demoNews(); arts = d.arts; events = d.events; demo = true; }
  const withAnalysis: EventWithAnalysis[] = await Promise.all(events.slice(0, 80).map(async ev => ({ ...ev, analysis: await rulesProvider.analyze(ev) })));
  return { arts: arts as Article[], events: withAnalysis, errors: r.value.errors, demo, stale: r.stale };
}
