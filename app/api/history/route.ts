import { getHistory } from "@/lib/providers/quotes";
import { env, fail } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const u = new URL(req.url); const id = u.searchParams.get("id") ?? ""; const days = Math.min(365, Math.max(7, +(u.searchParams.get("days") ?? 90)));
  const ohlc = u.searchParams.get("type") === "ohlc";
  try { return env(await getHistory(id, days, ohlc), "provider history"); } catch (e: any) { return fail(e.message, 502); }
}
