"use client";
import { use } from "react";
import Link from "next/link";
import { SaveEventBtns, Banner, ImpactMeter, ImpactCard, ImpBadge, Loading, NewsCard, Pipeline, StatusBadge } from "@/components/ui";
import { useNews, useQuotes } from "@/lib/hooks";

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const n = useNews(); const { byId } = useQuotes();
  if (n.loading && !n.events.length) return <Loading />;
  const ev = n.events.find(e => e.id === id);
  if (!ev) return <div className="space-y-2"><p className="text-mute">Event not found — it may have aged out of the feed.</p><Link href="/news" className="text-info">← Back to news</Link></div>;
  const s = ev.analysis.sections;
  return (<div className="space-y-5">
    <Link href="/news" className="text-xs text-info">← Live News</Link>
    <div><div className="flex flex-wrap items-center gap-1.5 mb-2"><ImpactMeter score={ev.impactScore} /><ImpBadge v={ev.importance} /><StatusBadge v={ev.status} /><span className="chip">{ev.category}</span>{ev.country && <span className="chip">{ev.country}</span>}</div>
      <h1 className="text-xl font-bold leading-snug">{ev.title}</h1><div className="mt-3 flex flex-wrap gap-2"><SaveEventBtns ev={ev} /></div></div>
    <Banner demo={n.env?.demo} />
    <Pipeline ev={ev} quotes={byId} />
    <section><h2 className="font-semibold mb-2">Impact by asset</h2>
      {ev.analysis.impacts.length ? <div className="grid gap-3 lg:grid-cols-2">{ev.analysis.impacts.map(i => <ImpactCard key={i.asset} i={i} q={byId[i.asset]} />)}</div> : <p className="text-sm text-mute">The rule set found no clear market-transmission channel for this story.</p>}</section>
    {ev.analysis.scenarios.length > 0 && <section><h2 className="font-semibold mb-2">Possible scenarios</h2><div className="grid gap-3 md:grid-cols-3">{ev.analysis.scenarios.map(s => <div key={s.name} className="card p-4"><div className="font-medium text-sm">{s.name}</div><p className="mt-1 text-sm text-mute">{s.description}</p><div className="mt-2 text-xs">Assets: {s.assets}</div></div>)}</div></section>}
    <section className="card p-4 space-y-2 text-sm"><h2 className="font-semibold">AI Market Intelligence <span className="chip ml-1">rule-based</span></h2>
      {([["What happened", s.what], ["Why it matters", s.why], ["Which assets could be affected", s.assets], ["Possible scenarios", s.scenarios], ["Why the market could react", s.reaction]] as const).map(([h, t]) => <p key={h}><b className="text-mute">{h}: </b>{t}</p>)}
      <div><b className="text-mute">What to watch next: </b><ul className="list-disc pl-5">{s.watch.map(w => <li key={w}>{w}</li>)}</ul></div>
      <p><b className="text-mute">Confidence & source quality: </b><span className="uppercase">{s.confidence.level}</span> — {s.confidence.note}</p></section>
    <section><h2 className="font-semibold mb-2">Reports ({ev.articles.length})</h2><div className="grid gap-3 lg:grid-cols-2">{ev.articles.map(a => <NewsCard key={a.id} a={a} compact />)}</div></section>
    <p className="text-[11px] text-mute">Analyses describe possible mechanisms, not predictions. Correlation in past data is not causation. Not investment advice.</p>
  </div>);
}
