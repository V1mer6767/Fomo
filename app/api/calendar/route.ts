import { getCalendar } from "@/lib/providers/calendar";
import { env } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET() { const r = await getCalendar(); return env(r.events, "Official central-bank schedules (curated) + Forex Factory weekly feed", { errors: r.errors }); }
