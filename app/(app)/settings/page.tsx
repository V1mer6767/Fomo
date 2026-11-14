"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSetting, clearLocalData } from "@/lib/storage";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/components/AuthProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ASSETS } from "@/lib/assets";
import { usePrefs } from "@/lib/userdata";
import { validateConfirm, validatePassword } from "@/lib/validate";
import { Field } from "@/components/AuthForm";
import MonitoringSettings from "@/components/MonitoringSettings";

export default function Settings() {
  const { configured, user, signOut, syncError } = useAuth(); const router = useRouter();
  const [theme, setTheme] = useSetting<"dark" | "light">("theme", "dark"); const [prefs, setPrefs] = usePrefs();
  const q = useApi<any[]>("/api/quotes"); const nw = useApi<any>("/api/news");
  const account = configured && !!user; const emailUser = !!user?.identities?.some(i => i.provider === "email");
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [pwErr, setPwErr] = useState<{ pw?: string | null; pw2?: string | null; form?: string; ok?: string }>({}); const [pwBusy, setPwBusy] = useState(false);
  const [del, setDel] = useState(false); const [confirmText, setConfirmText] = useState(""); const [delPw, setDelPw] = useState(""); const [delErr, setDelErr] = useState<string | null>(null); const [delBusy, setDelBusy] = useState(false);
  const changePw = async (e: React.FormEvent) => {
    e.preventDefault(); const f = { pw: validatePassword(pw), pw2: validateConfirm(pw, pw2) }; setPwErr(f); if (f.pw || f.pw2) return;
    setPwBusy(true); const { error } = await supabaseBrowser().auth.updateUser({ password: pw }); setPwBusy(false);
    if (error) return setPwErr({ form: error.message }); setPw(""); setPw2(""); setPwErr({ ok: "Password updated." });
  };
  const remove = async () => {
    setDelErr(null); setDelBusy(true);
    const r = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: confirmText, password: delPw }) });
    const j = await r.json().catch(() => ({})); setDelBusy(false);
    if (!r.ok) return setDelErr(j.error ?? "Couldn't delete the account.");
    try { await supabaseBrowser().auth.signOut({ scope: "local" }); } catch {}
    clearLocalData(); router.replace("/login?error=" + encodeURIComponent("Your account was deleted.")); router.refresh();
  };
  return (<div className="space-y-5 max-w-2xl"><h1 className="text-2xl font-bold tracking-tight">Settings</h1>
    {account && <section className="card p-4 text-sm"><div className="font-semibold mb-1">Account</div><div className="text-mute">{user!.email}</div><div className="mt-2 flex gap-2"><Link href="/profile" className="btn">Edit profile</Link><button className="btn" onClick={signOut}>Sign out</button></div>
      {syncError && <div className="mt-2 text-xs text-warn">{syncError}</div>}</section>}
    <section className="card p-4"><div className="font-semibold mb-2">Appearance</div><div className="flex gap-2">{(["dark", "light"] as const).map(t => <button key={t} className={`btn ${theme === t ? "!border-info text-info" : ""}`} onClick={() => setTheme(t)}>{t}</button>)}</div></section>
    {account && <MonitoringSettings />}
    <section className="card p-4 text-sm"><div className="font-semibold mb-2">Dashboard preferences</div><div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-mute">Default chart asset<select className="inp mt-1 w-full" value={prefs.defaultAsset} onChange={e => setPrefs({ ...prefs, defaultAsset: e.target.value })}>{ASSETS.map(a => <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>)}</select></label>
      <label className="text-xs text-mute">News sorting<select className="inp mt-1 w-full" value={prefs.newsSort} onChange={e => setPrefs({ ...prefs, newsSort: e.target.value as "new" | "impact" })}><option value="new">Newest first</option><option value="impact">Highest impact first</option></select></label></div></section>
    {account && emailUser && <section className="card p-4"><div className="font-semibold mb-2">Change password</div>
      <form onSubmit={changePw} className="space-y-3" noValidate><Field label="New password" type="password" value={pw} onChange={setPw} autoComplete="new-password" error={pwErr.pw} /><Field label="Confirm new password" type="password" value={pw2} onChange={setPw2} autoComplete="new-password" error={pwErr.pw2} />
        {pwErr.form && <div className="text-sm text-down">{pwErr.form}</div>}{pwErr.ok && <div className="text-sm text-up">{pwErr.ok}</div>}
        <button className="btn-p bg-gradient-to-r from-info to-pink" disabled={pwBusy}>{pwBusy && <Loader2 size={13} className="animate-spin" />}Update password</button></form></section>}
    <section className="card p-4 text-sm space-y-1"><div className="font-semibold mb-2">Data sources</div>
      <div>Quotes: {q.env?.demo ? "DEMO" : q.env ? "live" : "…"} <span className="text-mute">— {q.env?.source}</span></div>{q.env?.errors?.map(e => <div key={e} className="text-xs text-warn">{e}</div>)}
      <div>News: {nw.env?.demo ? "DEMO" : nw.env ? "live" : "…"} <span className="text-mute">— {nw.env?.source}</span></div>{nw.env?.errors?.map((e: string) => <div key={e} className="text-xs text-warn">{e}</div>)}</section>
    {!account && <section className="card p-4"><div className="font-semibold mb-2">Local data</div><button className="btn" onClick={() => { if (confirm("Delete watchlist, portfolio, alerts and settings stored in this browser?")) { clearLocalData(); location.reload(); } }}>Reset all local data</button></section>}
    {account && <section className="card border-down/50 p-4 text-sm"><div className="font-semibold text-down mb-1">Delete account</div><p className="text-mute">Permanently deletes your account and all saved data. This can’t be undone.</p>
      <button className="btn mt-3 text-down" onClick={() => setDel(true)}>Delete my account…</button></section>}
    {del && <div className="fixed inset-0 z-[70] grid place-items-center p-4"><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !delBusy && setDel(false)} />
      <div role="dialog" aria-modal className="card card-ai relative w-full max-w-md space-y-3 bg-bg p-5"><h2 className="text-lg font-bold text-down">Delete account?</h2>
        <p className="text-sm text-mute">Everything — watchlists, portfolio, alerts, saved news and analyses — will be erased permanently. Type <b className="text-fg">DELETE</b> to confirm.</p>
        <input className="inp w-full" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="DELETE" autoComplete="off" />
        {emailUser && <Field label="Your password" type="password" value={delPw} onChange={setDelPw} autoComplete="current-password" />}
        {delErr && <div role="alert" className="text-sm text-down">{delErr}</div>}
        <div className="flex justify-end gap-2"><button className="btn" onClick={() => setDel(false)} disabled={delBusy}>Cancel</button>
          <button className="btn-p bg-down" onClick={remove} disabled={delBusy || confirmText !== "DELETE" || (emailUser && !delPw)}>{delBusy && <Loader2 size={13} className="animate-spin" />}Delete forever</button></div></div></div>}
  </div>);
}
