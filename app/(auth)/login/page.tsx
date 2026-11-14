"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { isConfigured } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/client";
import { safeNext, validateEmail } from "@/lib/validate";
import { Banner, Field, GoogleButton, SetupNotice, Submit } from "@/components/AuthForm";

function Form() {
  const router = useRouter(); const sp = useSearchParams(); const next = safeNext(sp.get("next"));
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(sp.get("error")); const [info, setInfo] = useState<string | null>(sp.get("verified") ? "Email confirmed — you can sign in." : null);
  const [fe, setFe] = useState<{ email?: string | null; password?: string | null }>({}); const [busy, setBusy] = useState(false); const [unconfirmed, setUnconfirmed] = useState(false);
  if (!isConfigured) return <SetupNotice />;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setInfo(null); setUnconfirmed(false);
    const f = { email: validateEmail(email), password: password ? null : "Enter your password." }; setFe(f); if (f.email || f.password) return;
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setBusy(false); if (/not confirmed/i.test(error.message)) { setUnconfirmed(true); setErr("Please confirm your email first — check your inbox."); } else setErr(/invalid login/i.test(error.message) ? "Incorrect email or password." : error.message); return; }
    router.replace(next); router.refresh();
  };
  const resend = async () => { const { error } = await supabaseBrowser().auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${location.origin}/auth/callback` } }); setErr(null); setInfo(error ? error.message : "Verification email sent."); };
  return (<form onSubmit={submit} className="space-y-4" noValidate>
    <div><h1 className="text-xl font-bold">Welcome back</h1><p className="text-sm text-mute">Sign in to your Trade Info account.</p></div>
    <GoogleButton next={next} />
    {err && <Banner kind="error">{err}{unconfirmed && <button type="button" onClick={resend} className="ml-2 underline">Resend email</button>}</Banner>}
    {info && <Banner kind="ok">{info}</Banner>}
    <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" error={fe.email} placeholder="you@example.com" />
    <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" error={fe.password} />
    <div className="text-right text-xs"><Link href="/forgot-password" className="text-info hover:underline">Forgot password?</Link></div>
    <Submit busy={busy}>Sign in</Submit>
    <p className="text-center text-sm text-mute">New here? <Link href="/signup" className="text-info hover:underline">Create account</Link></p>
  </form>);
}
export default function Page() { return <Suspense><Form /></Suspense>; }
