"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useNews, useQuotes } from "@/lib/hooks";
import { asset } from "@/lib/assets";
import { DirBadge, ImpactMeter, ImpBadge, Pipeline, StatusBadge } from "./ui";

const Ctx = createContext<{ open: (id: string) => void }>({ open: () => {} });
export const usePanel = () => useContext(Ctx);

/** Slide-over analysis panel for a news event (News → Assets → Impact). */
export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && setId(null); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  return (<Ctx.Provider value={{ open: setId }}>{children}{id && <PanelView id={id} close={() => setId(null)} />}</Ctx.Provider>);
}
function PanelView({ id, close }: { id: string; close: () => void }) {
  const n = useNews(); const { byId } = useQuotes(); const ev = n.events.find(e => e.id === id);
  const s = ev?.analysis.sections;
  return (<div className="fixed inset-0 z-[60] flex justify-end">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in" onClick={close} />
    <aside className="relative slide-in h-full w-full max-w-xl overflow-y-auto border-l border-info/40 bg-bg p-5 shadow-[-20px_0_60px_-20px_rgba(139,92,246,.5)]" role="dialog" aria-label="News analysis">
      <button className="btn !px-2 absolute right-4 top-4" onClick={close} aria-label="Close"><X size={14} /></button>
      {!ev ? <p className="text-mute text-sm pt-8">This event is no longer in the feed.</p> : <div className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center gap-1.5 pr-10"><ImpactMeter score={ev.impactScore} /><ImpBadge v={ev.importance} /><StatusBadge v={ev.status} /><span className="chip">{ev.category}</span>{ev.country && <span className="chip">{ev.country}</span>}</div>
        <h2 className="text-lg font-bold leading-snug">{ev.title}</h2>
        <Pipeline ev={ev} quotes={byId} stack />
        <div className="space-y-2">{ev.analysis.impacts.slice(0, 6).map(i => (<div key={i.asset} className="card p-3"><div className="flex items-center justify-between"><Link href={`/assets/${i.asset}`} onClick={close} className="font-semibold hover:text-info">{asset(i.asset)?.symbol ?? i.asset}</Link><DirBadge v={i.direction} /></div><p className="mt-1 text-xs text-mute">{i.mechanism}</p><p className="mt-1 text-xs"><b className="text-mute">Could differ if: </b>{i.alternative}</p></div>))}</div>
        {s && <div className="card card-ai p-4 text-sm space-y-1.5"><div className="font-semibold">AI Market Intelligence</div><p><b className="text-mute">Why it matters: </b>{s.why}</p><p><b className="text-mute">Confidence: </b><span className="uppercase">{s.confidence.level}</span> — {s.confidence.note}</p></div>}
        <div className="flex flex-wrap gap-2"><Link href={`/news/${ev.id}`} onClick={close} className="btn-p">Open full analysis</Link>{ev.articles[0] && <a className="btn" href={ev.articles[0].url} target="_blank" rel="noopener noreferrer">Read source ↗</a>}</div>
        <p className="text-[11px] text-mute">Scenarios describe possible mechanisms, not predictions.</p>
      </div>}
    </aside></div>);
}
