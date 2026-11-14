"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isConfigured } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/client";
import { validateConfirm, validateEmail, validatePassword } from "@/lib/validate";
import { Banner, Field, GoogleButton, SetupNotice, Submit } from "@/components/AuthForm";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null); const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false);
  const [fe, setFe] = useState<Record<string, string | null>>({});
  if (!isConfigured) return <SetupNotice />;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    const f = { email: validateEmail(email), pw: validatePassword(pw), pw2: validateConfirm(pw, pw2) }; setFe(f); if (f.email || f.pw || f.pw2) return;
    setBusy(true);
    const { data, error } = await supabaseBrowser().auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    if (data.session) { router.replace("/"); router.refresh(); return; }
    // With email confirmation on, Supabase returns an obfuscated user for already-registered emails (identities empty).
    if (data.user && data.user.identities?.length === 0) { setErr("An account with this email already exists. Try signing in."); return; }
    setSent(true);
  };
  if (sent) return (<div className="space-y-3 text-center"><h1 className="text-xl font-bold">Check your email</h1>
    <p className="text-sm text-mute">We sent a confirmation link to <b className="text-fg">{email.trim()}</b>. Open it to activate your account, then sign in.</p>
    <Link href="/login" className="btn-p inline-flex bg-gradient-to-r from-info to-pink">Back to sign in</Link></div>);
  return (<form onSubmit={submit} className="space-y-4" noValidate>
    <div><h1 className="text-xl font-bold">Create your account</h1><p className="text-sm text-mute">Save your watchlists, portfolio, alerts and analyses across devices.</p></div>
    <GoogleButton />
    {err && <Banner kind="error">{err}</Banner>}
    <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" error={fe.email} placeholder="you@example.com" />
    <Field label="Password" type="password" value={pw} onChange={setPw} autoComplete="new-password" error={fe.pw} placeholder="8+ characters, letter and number" />
    <Field label="Confirm password" type="password" value={pw2} onChange={setPw2} autoComplete="new-password" error={fe.pw2} />
    <Submit busy={busy}>Create account</Submit>
    <p className="text-center text-sm text-mute">Already have an account? <Link href="/login" className="text-info hover:underline">Sign in</Link></p>
  </form>);
}
