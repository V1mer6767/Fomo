"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import NeedAccount from "@/components/NeedAccount";
import { useAuth } from "@/components/AuthProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ago } from "@/lib/hooks";
import { Loading } from "@/components/ui";

import { LevelBadge } from "@/components/LevelBadge";

export default function Monitor() {
  const { configured, user } = useAuth(); const [rows, setRows] = useState<any[] | null>(null); const [lvl, setLvl] = useState("all"); const [job, setJob] = useState<string | null>(null);
  useEffect(() => { if (!configured || !user) return;
    supabaseBrowser().from("news_events").select("id,title,importance,category,country,status,assets,source_count,last_seen,latest_published,analysis_origin").order("last_seen", { ascending: false }).limit(150).then(({ data }) => { setRows(data ?? []); setJob(data?.[0]?.last_seen ?? null); });
  }, [configured, user]);
  if (!configured || !user) return <NeedAccount title="Monitored Events" />;
  const list = (rows ?? []).filter(r => lvl === "all" || r.importance === lvl);
  return (<div className="space-y-4"><div><h1 className="text-2xl font-bold tracking-tight">Monitored Events</h1>
    <p className="text-sm text-mute">Collected automatically by the background monitor{job ? ` · last update ${ago(job)}` : ""}. Importance reflects the event, not expected price movement.</p></div>
    <div className="flex flex-wrap gap-2">{["all", "critical", "high", "medium", "low"].map(l => <button key={l} className={`btn capitalize ${lvl === l ? "btn-on" : ""}`} onClick={() => setLvl(l)}>{l}</button>)}</div>
    {!rows ? <Loading /> : !list.length ? <div className="card p-5 text-sm text-mute">No monitored events yet. The monitor runs on a schedule (see README); once it has run, events appear here.</div> :
      <div className="space-y-2">{list.map(r => <Link key={r.id} href={`/monitor/${r.id}`} className="card lift block p-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5"><LevelBadge v={r.importance} /><span className="chip">{r.status}</span><span className="chip">{r.category}</span>{r.country && <span className="chip">{r.country}</span>}{r.analysis_origin && <span className="chip">{r.analysis_origin === "ai" ? "AI analysis" : "rule-based"}</span>}</div>
        <div className="font-semibold leading-snug">{r.title}</div>
        <div className="mt-1 text-[11px] text-mute">{r.source_count} source(s) · {r.latest_published ? ago(r.latest_published) : ago(r.last_seen)}{r.assets?.length ? ` · ${r.assets.slice(0, 6).join(", ")}` : ""}</div></Link>)}</div>}
  </div>);
}
