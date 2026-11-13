import { FOMC, FOMC_SOURCE, fomcReactions } from "@/lib/providers/history";
import { env, fail } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const d = new URL(req.url).searchParams.get("date");
  if (!d) return env({ events: FOMC, sourceUrl: FOMC_SOURCE }, "Federal Reserve (curated list)");
  const e = FOMC.find(x => x.date === d); if (!e) return fail("unknown event", 404);
  return env({ event: e, reactions: await fomcReactions(e) }, "Provider daily closes (computed)");
}
