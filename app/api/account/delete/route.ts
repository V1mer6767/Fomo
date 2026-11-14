import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
const json = (b: object, status: number) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });

/** Permanently deletes the signed-in user and (via ON DELETE CASCADE) all of their rows. Needs SUPABASE_SERVICE_ROLE_KEY (server only). */
export async function POST(req: NextRequest) {
  if (!isConfigured) return json({ error: "Accounts are not configured." }, 501);
  const origin = req.headers.get("origin"); if (origin && origin !== req.nextUrl.origin) return json({ error: "Forbidden." }, 403);
  const body = await req.json().catch(() => null) as { confirm?: string; password?: string } | null;
  if (body?.confirm !== "DELETE") return json({ error: "Type DELETE to confirm." }, 400);
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: "Not signed in." }, 401);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return json({ error: "Account deletion isn't enabled: SUPABASE_SERVICE_ROLE_KEY is not set on the server." }, 501);
  const emailUser = user.app_metadata?.provider === "email" || user.identities?.some(i => i.provider === "email");
  if (emailUser && user.email) {
    if (!body.password) return json({ error: "Enter your password to confirm." }, 400);
    const probe = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await probe.auth.signInWithPassword({ email: user.email, password: body.password });
    if (error) return json({ error: "Incorrect password." }, 403);
  }
  const admin = createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "Couldn't delete the account. Try again." }, 500);
  await sb.auth.signOut().catch(() => {});
  return json({ ok: true }, 200);
}
