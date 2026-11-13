import { getAllQuotes } from "@/lib/providers/quotes";
import { demoQuotes } from "@/lib/demo";
import { env } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const r = await getAllQuotes();
  if (!r.quotes.length) return env(demoQuotes(), "DEMO", { demo: true, errors: r.errors });
  // fill any missing assets with nothing (never fabricate); report errors
  return env(r.quotes, "CoinGecko / ECB / Stooq", { errors: r.errors, stale: r.stale });
}
