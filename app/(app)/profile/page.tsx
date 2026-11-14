"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, Camera, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { usePanel } from "@/components/Panel";
import { ago } from "@/lib/hooks";
import { useSavedAnalyses, useSavedNews } from "@/lib/userdata";
import { validateDisplayName } from "@/lib/validate";

/** Resize to ≤160px and re-encode so the avatar stays a small data URL (stored in profiles.avatar_url). */
async function toAvatar(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Use a PNG, JPEG or WebP image.");
  const img = await createImageBitmap(file); const S = 160; const c = document.createElement("canvas"); c.width = c.height = S;
  const r = Math.max(S / img.width, S / img.height); const w = img.width * r, h = img.height * r;
  c.getContext("2d")!.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
  let url = c.toDataURL("image/jpeg", 0.85); if (url.length > 55_000) url = c.toDataURL("image/jpeg", 0.6);
  return url;
}
export default function Profile() {
  const { configured, user, profile, updateProfile } = useAuth(); const panel = usePanel();
  const news = useSavedNews(); const an = useSavedAnalyses();
  const [name, setName] = useState<string | null>(null); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"news" | "analyses">("news"); const file = useRef<HTMLInputElement>(null);
  const shown = name ?? profile?.display_name ?? "";
  if (!configured || !user) return (<div className="max-w-xl space-y-3"><h1 className="text-2xl font-bold">My Profile</h1><div className="card p-5 text-sm text-mute">You’re in local mode. {configured ? <>Sign in to get a profile. <Link href="/login" className="text-info">Sign in</Link></> : "Configure Supabase (see README) to enable accounts."}</div></div>);
  const flash = (ok: boolean, t: string) => { setMsg({ ok, t }); setTimeout(() => setMsg(null), 4000); };
  const save = async () => { const e = validateDisplayName(shown); if (e) return flash(false, e); setBusy(true); const r = await updateProfile({ display_name: shown }); setBusy(false); r ? flash(false, r) : (flash(true, "Profile updated."), setName(null)); };
  const pick = async (f?: File) => { if (!f) return; try { const url = await toAvatar(f); const r = await updateProfile({ avatar_url: url }); r ? flash(false, r) : flash(true, "Avatar updated."); } catch (e: any) { flash(false, e.message ?? "Couldn't read that image."); } };
  const initial = (shown || user.email || "?").charAt(0).toUpperCase();
  return (<div className="max-w-3xl space-y-5"><h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
    <section className="card card-ai p-5"><div className="flex flex-wrap items-center gap-5">
      <button onClick={() => file.current?.click()} className="group relative grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet to-pink text-3xl font-bold text-white" aria-label="Change avatar">
        {profile?.avatar_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initial}
        <span className="absolute inset-0 grid place-items-center bg-black/55 opacity-0 transition group-hover:opacity-100"><Camera size={20} /></span></button>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="min-w-0 flex-1 space-y-2"><label className="block text-xs text-mute">Display name
        <div className="mt-1 flex gap-2"><input className="inp min-w-0 flex-1" value={shown} maxLength={50} onChange={e => setName(e.target.value)} /><button className="btn-p bg-gradient-to-r from-info to-pink" onClick={save} disabled={busy || name === null}>{busy ? <Loader2 size={13} className="animate-spin" /> : "Save"}</button></div></label>
        <div className="text-sm"><span className="text-mute">Email: </span>{user.email}</div>
        <div className="text-sm"><span className="text-mute">Member since: </span>{new Date(profile?.created_at ?? user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</div></div></div>
      {profile?.avatar_url && <button className="btn mt-3 text-down" onClick={async () => { const r = await updateProfile({ avatar_url: null }); r ? flash(false, r) : flash(true, "Avatar removed."); }}><Trash2 size={12} />Remove avatar</button>}
      {msg && <div role="status" className={`mt-3 text-sm ${msg.ok ? "text-up" : "text-down"}`}>{msg.t}</div>}</section>
    <section className="card p-4"><div className="mb-3 flex gap-2">
      <button className={`btn ${tab === "news" ? "btn-on" : ""}`} onClick={() => setTab("news")}><Bookmark size={13} />Saved news ({news.list.length})</button>
      <button className={`btn ${tab === "analyses" ? "btn-on" : ""}`} onClick={() => setTab("analyses")}><Sparkles size={13} />Saved analyses ({an.list.length})</button></div>
      {tab === "news" ? (news.list.length ? <ul className="divide-y divide-line">{news.list.map(n => <li key={n.eventId} className="flex items-start gap-3 py-2.5"><div className="min-w-0 flex-1"><button className="text-left text-sm font-medium hover:text-info" onClick={() => panel.open(n.eventId)}>{n.title}</button><div className="text-[11px] text-mute">{n.source} · saved {ago(n.savedAt)}</div></div>{n.url && <a className="btn !px-2" href={n.url} target="_blank" rel="noopener noreferrer">↗</a>}<button className="btn !px-2" aria-label="Remove" onClick={() => news.remove(n.eventId)}><Trash2 size={13} /></button></li>)}</ul> : <p className="py-3 text-sm text-mute">No saved news yet. Use “Save news” on any story.</p>)
        : (an.list.length ? <ul className="divide-y divide-line">{an.list.map(n => <li key={n.eventId} className="py-2.5"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><Link href={`/news/${n.eventId}`} className="text-sm font-medium hover:text-info">{n.title}</Link><div className="text-[11px] text-mute">Impact {n.analysis?.impactScore ?? "–"} · {(n.analysis?.impacts ?? []).slice(0, 5).map((i: any) => i.asset).join(", ")} · saved {ago(n.savedAt)}</div>{n.analysis?.sections?.why && <p className="mt-1 line-clamp-2 text-xs text-mute">{n.analysis.sections.why}</p>}</div><button className="btn !px-2" aria-label="Remove" onClick={() => an.remove(n.eventId)}><Trash2 size={13} /></button></div></li>)}</ul> : <p className="py-3 text-sm text-mute">No saved analyses yet. Use “Save analysis” in an event panel.</p>)}</section></div>);
}
