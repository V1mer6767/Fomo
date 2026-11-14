"use client";
import { useState } from "react";
import Link from "next/link";
import { isConfigured } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/validate";
import { Banner, Field, SetupNotice, Submit } from "@/components/AuthForm";

export default function Page() {
  const [email, setEmail] = useState(""); const [err, setErr] = useState<string | null>(null); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  if (!isConfigured) return <SetupNotice />;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); const v = validateEmail(email); if (v) { setErr(v); return; }
    setBusy(true);
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/auth/callback?next=/reset-password` });
    setBusy(false);
    if (error && /rate|seconds/i.test(error.message)) { setErr("Too many requests — wait a minute and try again."); return; }
    setDone(true); // same message whether or not the account exists
  };
  if (done) return (<div className="space-y-3 text-center"><h1 className="text-xl font-bold">Check your email</h1>
    <p className="text-sm text-mute">If an account exists for <b className="text-fg">{email.trim()}</b>, a reset link is on its way.</p>
    <Link href="/login" className="btn-p inline-flex bg-gradient-to-r from-info to-pink">Back to sign in</Link></div>);
  return (<form onSubmit={submit} className="space-y-4" noValidate>
    <div><h1 className="text-xl font-bold">Reset password</h1><p className="text-sm text-mute">Enter your email and we’ll send you a reset link.</p></div>
    {err && <Banner kind="error">{err}</Banner>}
    <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@example.com" />
    <Submit busy={busy}>Send reset link</Submit>
    <p className="text-center text-sm"><Link href="/login" className="text-info hover:underline">Back to sign in</Link></p>
  </form>);
}
