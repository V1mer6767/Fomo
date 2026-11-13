import { fetchAllNews } from "@/lib/providers/news";
import { buildArticles, groupEvents, rulesProvider } from "@/lib/analysis/engine";
import { cached } from "@/lib/cache";
import { demoNews } from "@/lib/demoNews";
import { env } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const r = await cached("news:built", 2 * 60_000, async () => {
    const { items, errors } = await fetchAllNews();
    const cutoff = Date.now() - 3 * 864e5;
    const arts = buildArticles(items.filter(i => +new Date(i.publishedAt) > cutoff));
    const events = groupEvents(arts);
    return { arts, events, errors };
  });
  let { arts, events } = r.value; const errors = r.value.errors; let demo = false;
  if (!arts.length) { const d = demoNews(); arts = d.arts; events = d.events; demo = true; }
  const withAnalysis = await Promise.all(events.slice(0, 80).map(async ev => ({ ...ev, analysis: await rulesProvider.analyze(ev) })));
  return env({ articles: arts.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt)).slice(0, 300), events: withAnalysis }, demo ? "DEMO" : "RSS (BBC, CNBC, Al Jazeera, Guardian, CoinDesk, Cointelegraph, Fed, ECB) + GDELT", { demo, errors, stale: r.stale });
}
