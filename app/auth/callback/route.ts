import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/supabase/config";
import { safeNext } from "@/lib/validate";

/** Handles email-confirmation, password-recovery and OAuth redirects. */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const fail = (m: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(m)}`);
  if (!isConfigured) return fail("Accounts are not configured.");
  const oauthErr = searchParams.get("error_description"); if (oauthErr) return fail(oauthErr.slice(0, 200));
  const sb = await supabaseServer();
  const code = searchParams.get("code"); const hash = searchParams.get("token_hash"); const type = searchParams.get("type") as EmailOtpType | null;
  let error: { message: string } | null = null;
  if (code) ({ error } = await sb.auth.exchangeCodeForSession(code));
  else if (hash && type) ({ error } = await sb.auth.verifyOtp({ type, token_hash: hash }));
  else return fail("Invalid or expired link.");
  if (error) return fail("This link is invalid or has expired.");
  return NextResponse.redirect(`${origin}${next}`);
}
