"use client";
import { useState } from "react";
import Link from "next/link";
import { Banner, ImpactMeter, Loading, StatusBadge } from "@/components/ui";
import { useNews } from "@/lib/hooks";
import { asset } from "@/lib/assets";
export default function Intelligence() {
  const n = useNews(); const [sel, setSel] = useState<string>("");
  const evs = n.events.filter(e => e.analysis.impacts.length).slice(0, 25); const ev = evs.find(e => e.id === sel) ?? evs[0];
  return (<div className="space-y-4"><h1 className="text-xl font-bold">AI Market Intelligence</h1>
    <Banner demo={n.env?.demo} errors={n.env?.errors} />
    {n.loading && !evs.length ? <Loading n={4} /> : <div className="grid lg:grid-cols-[320px_1fr] gap-4">
      <div className="card max-h-[70vh] overflow-y-auto divide-y divide-line">{evs.map(e => <button key={e.id} onClick={() => setSel(e.id)} className={`block w-full text-left p-3 hover:bg-panel2 ${ev?.id === e.id ? "bg-panel2" : ""}`}><div className="text-sm font-medium leading-snug">{e.title}</div><div className="mt-1 flex gap-1.5"><ImpactMeter score={e.impactScore} compact /><StatusBadge v={e.status} /></div></button>)}</div>
      {ev ? <div className="space-y-3">
        <div className="card p-4"><h2 className="font-semibold leading-snug">{ev.title}</h2><Link href={`/news/${ev.id}`} className="text-xs text-info">Open event & asset impact →</Link></div>
        {([["1 · What happened", ev.analysis.sections.what], ["2 · Why it matters", ev.analysis.sections.why], ["3 · Which assets could be affected", ev.analysis.sections.assets], ["4 · Possible scenarios", ev.analysis.sections.scenarios], ["5 · Why the market could react", ev.analysis.sections.reaction]] as const).map(([h, t]) => <div key={h} className="card p-4"><div className="text-[11px] uppercase tracking-wider text-mute mb-1">{h}</div><p className="text-sm">{t}</p></div>)}
        <div className="card p-4"><div className="text-[11px] uppercase tracking-wider text-mute mb-1">6 · What to watch next</div><ul className="list-disc pl-5 text-sm">{ev.analysis.sections.watch.map(w => <li key={w}>{w}</li>)}</ul></div>
        <div className="card p-4"><div className="text-[11px] uppercase tracking-wider text-mute mb-1">7 · Confidence & source quality</div><p className="text-sm"><b className="uppercase">{ev.analysis.sections.confidence.level}</b> — {ev.analysis.sections.confidence.note}</p><p className="text-xs text-mute mt-1">Sources: {ev.sources.join(", ")}</p></div>
        <div className="grid md:grid-cols-3 gap-3">{ev.analysis.scenarios.map(s => <div key={s.name} className="card p-3 text-sm"><b>{s.name}</b><p className="text-mute mt-1">{s.description}</p><p className="text-xs mt-1">{s.assets.split(", ").map(a => asset(a)?.symbol ?? a).join(", ")}</p></div>)}</div>
      </div> : <p className="text-mute">No analysable events at the moment.</p>}</div>}</div>);
}
