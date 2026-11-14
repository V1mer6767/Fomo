"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import NeedAccount from "@/components/NeedAccount";
import { useAuth } from "@/components/AuthProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ago } from "@/lib/hooks";
import { Loading } from "@/components/ui";
import { LevelBadge } from "@/components/LevelBadge";

const IMP: Record<string, string> = { positive: "text-up", negative: "text-down", mixed: "text-warn", uncertain: "text-mute", none: "text-mute" };
const IMP_LABEL: Record<string, string> = { positive: "Potentially positive", negative: "Potentially negative", mixed: "Mixed", uncertain: "Uncertain", none: "No meaningful connection established" };
const List = ({ title, items }: { title: string; items?: string[] }) => items?.length ? <div><div className="text-xs font-semibold uppercase tracking-wider text-mute">{title}</div><ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null;

export default function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const { configured, user } = useAuth(); const [d, setD] = useState<any | null | undefined>(undefined);
  useEffect(() => { if (!configured || !user) return; const sb = supabaseBrowser();
    Promise.all([sb.from("news_events").select("*").eq("id", id).maybeSingle(), sb.from("event_sources").select("source,url,title,published_at").eq("event_id", id).order("published_at", { ascending: false }),
      sb.from("event_asset_relationships").select("*").eq("event_id", id).order("confidence", { ascending: false }), sb.from("ai_event_analyses").select("model,analysis,created_at").eq("event_id", id).maybeSingle()])
      .then(([e, s, r, a]) => setD(e.data ? { e: e.data, s: s.data ?? [], r: r.data ?? [], a: a.data } : null));
    sb.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("event_id", id).is("read_at", null).then(() => {});
  }, [configured, user, id]);
  if (!configured || !user) return <NeedAccount title="Event" />;
  if (d === undefined) return <Loading />;
  if (!d) return <div className="space-y-2"><p className="text-mute">Event not found.</p><Link href="/monitor" className="text-info">← Monitored events</Link></div>;
  const { e, s, r, a } = d; const an = a?.analysis;
  return (<div className="max-w-4xl space-y-5"><Link href="/monitor" className="text-xs text-info">← Monitored events</Link>
    <div><div className="mb-2 flex flex-wrap items-center gap-1.5"><LevelBadge v={e.importance} /><span className="chip">{e.status}</span><span className="chip">{e.category}</span>{e.country && <span className="chip">{e.country}</span>}</div>
      <h1 className="text-xl font-bold leading-snug">{e.title}</h1><div className="mt-1 text-[11px] text-mute">First seen {new Date(e.first_seen).toLocaleString()} · updated {ago(e.last_seen)} · {e.source_count} source(s)</div></div>
    {an ? <section className="card card-ai space-y-3 p-5"><div className="flex items-center justify-between"><div className="font-semibold">Analysis</div><span className="chip">{a.model === "rules" ? "rule-based" : `AI · ${a.model}`}</span></div>
      <div><div className="text-xs font-semibold uppercase tracking-wider text-mute">What happened</div><p className="mt-1 text-sm">{an.what}</p></div>
      <List title="Confirmed" items={an.confirmed} /><List title="Unconfirmed / single-source" items={an.unconfirmed} />
      {!!an.scenarios?.length && <div><div className="text-xs font-semibold uppercase tracking-wider text-mute">Possible scenarios (hypothetical)</div><div className="mt-1 space-y-1.5">{an.scenarios.map((x: any, i: number) => <p key={i} className="text-sm"><b>{x.name}:</b> {x.description}</p>)}</div></div>}
      <List title="What could contradict this reading" items={an.contradicts} /><List title="Monitor next" items={an.monitor} />
      <p className="text-[11px] text-mute">Interpretations and scenarios are not predictions. Correlation is not causation.</p></section> : <div className="card p-4 text-sm text-mute">No analysis yet — only high/critical events are analysed.</div>}
    {!!r.length && <section><h2 className="mb-2 font-semibold">Affected assets</h2><div className="grid gap-3 md:grid-cols-2">{r.map((x: any) => <div key={x.id} className="card p-3">
      <div className="flex items-center justify-between"><Link href={`/assets/${x.asset_id}`} className="font-semibold hover:text-info">{x.asset_id}</Link><span className={`text-xs font-medium ${IMP[x.impact]}`}>{IMP_LABEL[x.impact]}</span></div>
      <div className="mt-0.5 text-[11px] text-mute">{x.directness} · confidence {Math.round(x.confidence * 100)}% · {x.origin === "ai" ? "AI" : "rules"} · {new Date(x.created_at).toLocaleString()}</div>
      <p className="mt-1.5 text-sm text-mute">{x.reasoning}</p></div>)}</div></section>}
    <section><h2 className="mb-2 font-semibold">Sources</h2><ul className="card divide-y divide-line">{s.map((x: any) => <li key={x.url} className="flex items-start gap-2 p-3 text-sm"><div className="min-w-0 flex-1"><a href={x.url} target="_blank" rel="noopener noreferrer" className="hover:text-info">{x.title}</a><div className="text-[11px] text-mute">{x.source}{x.published_at ? ` · ${new Date(x.published_at).toLocaleString()}` : ""}</div></div></li>)}</ul></section></div>);
}
