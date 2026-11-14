"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isConfigured } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/client";
import { validateConfirm, validatePassword } from "@/lib/validate";
import { Banner, Field, SetupNotice, Submit } from "@/components/AuthForm";

export default function Page() {
  const router = useRouter();
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [err, setErr] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string | null>>({}); const [busy, setBusy] = useState(false); const [has, setHas] = useState<boolean | null>(null);
  useEffect(() => { if (isConfigured) supabaseBrowser().auth.getSession().then(({ data }) => setHas(!!data.session)); }, []);
  if (!isConfigured) return <SetupNotice />;
  if (has === false) return (<div className="space-y-3 text-center"><h1 className="text-xl font-bold">Link expired</h1><p className="text-sm text-mute">This reset link is invalid or has expired.</p><Link href="/forgot-password" className="btn-p inline-flex bg-gradient-to-r from-info to-pink">Request a new link</Link></div>);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    const f = { pw: validatePassword(pw), pw2: validateConfirm(pw, pw2) }; setFe(f); if (f.pw || f.pw2) return;
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.replace("/"); router.refresh();
  };
  return (<form onSubmit={submit} className="space-y-4" noValidate>
    <div><h1 className="text-xl font-bold">Choose a new password</h1></div>
    {err && <Banner kind="error">{err}</Banner>}
    <Field label="New password" type="password" value={pw} onChange={setPw} autoComplete="new-password" error={fe.pw} />
    <Field label="Confirm new password" type="password" value={pw2} onChange={setPw2} autoComplete="new-password" error={fe.pw2} />
    <Submit busy={busy}>Update password</Submit>
  </form>);
}
