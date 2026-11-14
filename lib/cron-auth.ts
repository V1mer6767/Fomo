import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/** Cron endpoints accept only `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends it automatically; GitHub Actions sets it manually). */
export function cronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return NextResponse.json({ error: "CRON_SECRET is not set (min 16 chars)." }, { status: 503 });
  const given = req.headers.get("authorization") ?? ""; const want = `Bearer ${secret}`;
  const a = Buffer.from(given), b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
