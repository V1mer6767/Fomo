import { getNewsEvents } from "@/lib/providers/newsFeed";
import { env } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const { arts, events, errors, demo, stale } = await getNewsEvents();
  return env({ articles: [...arts].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt)).slice(0, 300), events }, demo ? "DEMO" : "RSS (BBC, CNBC, Al Jazeera, Guardian, CoinDesk, Cointelegraph, Fed, ECB) + GDELT", { demo, errors, stale });
}
