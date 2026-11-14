import { NextRequest, NextResponse } from "next/server";
import { cronAuth } from "@/lib/cron-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runBriefing } from "@/lib/monitor/briefing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
async function handle(req: NextRequest) {
  const denied = cronAuth(req); if (denied) return denied;
  try { return NextResponse.json({ ok: true, result: await runBriefing(supabaseAdmin()) }); }
  catch (e: any) { console.error("[cron/briefing]", e.message); return NextResponse.json({ ok: false, error: String(e.message).slice(0, 200) }, { status: 500 }); }
}
export const GET = handle; export const POST = handle;
