"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import NeedAccount from "@/components/NeedAccount";
import { useAuth } from "@/components/AuthProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Loading } from "@/components/ui";
import Md from "@/components/Md";
import { LevelBadge } from "@/components/LevelBadge";

const Evs = ({ title, items }: { title: string; items?: any[] }) => items?.length ? <section><h3 className="mb-2 font-semibold">{title}</h3><div className="space-y-1.5">{items.map((e: any) => <div key={e.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm"><LevelBadge v={e.level} /><Link href={`/monitor/${e.id}`} className="min-w-0 flex-1 hover:text-info">{e.title}</Link><span className="text-[11px] text-mute">{e.status} · {e.sources} src{e.assets?.length ? ` · ${e.assets.slice(0, 4).join(", ")}` : ""}</span>{e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-info">source ↗</a>}</div>)}</div></section> : null;

export default function Briefing() {
  const { configured, user } = useAuth(); const [rows, setRows] = useState<any[] | null>(null); const [i, setI] = useState(0);
  useEffect(() => { if (configured && user) supabaseBrowser().from("daily_briefings").select("id,day,content").order("day", { ascending: false }).limit(14).then(({ data }) => setRows(data ?? [])); }, [configured, user]);
  if (!configured || !user) return <NeedAccount title="Daily Briefing" />;
  if (!rows) return <Loading />;
  if (!rows.length) return <div className="max-w-xl space-y-3"><h1 className="text-2xl font-bold tracking-tight">Daily Briefing</h1><div className="card p-5 text-sm text-mute">No briefing yet. It is generated once a day by the background job and saved to your account. Make sure “Daily briefing” is enabled in <Link href="/settings#monitoring" className="text-info">Settings</Link>.</div></div>;
  const b = rows[i].content;
  return (<div className="max-w-4xl space-y-5"><div className="flex flex-wrap items-center gap-2"><h1 className="mr-auto text-2xl font-bold tracking-tight">Daily Briefing</h1>
    <select className="inp" value={i} onChange={e => setI(Number(e.target.value))}>{rows.map((r, k) => <option key={r.id} value={k}>{r.day}</option>)}</select></div>
    <section className="card card-ai p-5"><div className="mb-1 flex items-center justify-between"><div className="font-semibold">Summary</div><span className="chip">{b.summaryBy === "ai" ? "AI-written" : "rule-based"}</span></div><Md text={b.summary} /><div className="mt-2 text-[10px] text-mute">Generated {new Date(b.generatedAt).toLocaleString()} from the last 24h of monitored events. Not investment advice.</div></section>
    <Evs title="Your assets" items={b.yourAssets} /><Evs title="Most important developments" items={b.top} /><Evs title="Geopolitics & policy" items={b.geopolitics} /><Evs title="Cryptocurrency" items={b.crypto} /><Evs title="Forex & central banks" items={b.forex} />
    {!!b.upcoming?.length && <section><h3 className="mb-2 font-semibold">Upcoming economic events</h3><div className="card divide-y divide-line">{b.upcoming.map((e: any, k: number) => <div key={k} className="flex flex-wrap items-center gap-2 p-3 text-sm"><span className="num text-mute">{e.date.slice(0, 10)}</span><span className="min-w-0 flex-1">{e.title}</span><span className="chip">{e.country}</span><span className="chip">{e.impact}</span></div>)}</div></section>}
    {!!b.affectedAssets?.length && <section><h3 className="mb-2 font-semibold">Potentially affected assets</h3><div className="flex flex-wrap gap-1.5">{b.affectedAssets.map((a: any) => <Link key={a.asset} href={`/assets/${a.asset}`} className="chip hover:border-info/60">{a.asset} · {a.mentions}</Link>)}</div></section>}
    {!!b.uncertainties?.length && <section><h3 className="mb-2 font-semibold">Important uncertainties</h3><ul className="list-disc space-y-1 pl-5 text-sm text-mute">{b.uncertainties.map((u: string, k: number) => <li key={k}>{u}</li>)}</ul></section>}
  </div>);
}
