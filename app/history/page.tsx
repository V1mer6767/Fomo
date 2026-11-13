"use client";
import { useState } from "react";
import { Change, Loading } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { asset } from "@/lib/assets";
import type { FomcEvent, Reaction } from "@/lib/providers/history";

function Row({ e }: { e: FomcEvent }) {
  const [open, setOpen] = useState(false);
  const r = useApi<{ reactions: Reaction[] }>(open ? `/api/historical?date=${e.date}` : null);
  return (<div className="border-t border-line"><button className="w-full text-left p-3 flex items-center gap-3 hover:bg-panel2" onClick={() => setOpen(!open)}><span className="num text-sm w-28">{e.date}</span><span className={`chip ${e.bps > 0 ? "text-down" : e.bps < 0 ? "text-up" : ""}`}>{e.action}{e.bps ? ` ${e.bps > 0 ? "+" : ""}${e.bps} bp` : ""}</span><span className="ml-auto text-xs text-info">{open ? "Hide" : "Show reactions"}</span></button>
    {open && <div className="px-3 pb-3">{r.loading ? <Loading n={1} /> : r.error ? <p className="text-sm text-mute">Unavailable: {r.error}</p> : <table className="w-full text-sm"><thead className="text-[11px] uppercase text-mute"><tr className="text-left"><th className="py-1">Asset</th><th className="text-right">Decision day</th><th className="text-right">+5 sessions</th><th className="pl-4">Note</th></tr></thead>
      <tbody>{r.env?.data.reactions.map(x => <tr key={x.asset} className="border-t border-line/50"><td className="py-1">{asset(x.asset)?.symbol}{x.asset === "EURUSD" ? <span className="text-[10px] text-mute"> (EUR up = USD down)</span> : ""}</td><td className="text-right"><Change v={x.day} /></td><td className="text-right"><Change v={x.week} /></td><td className="pl-4 text-xs text-mute">{x.note}</td></tr>)}</tbody></table>}</div>}</div>);
}
export default function History() {
  const l = useApi<{ events: FomcEvent[]; sourceUrl: string }>("/api/historical");
  return (<div className="space-y-4"><h1 className="text-xl font-bold">Historical Comparisons — FOMC decisions</h1>
    <div className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-xs text-warn">Past reactions are computed from real daily closing prices supplied by the data providers. They are descriptive only: they do not predict future moves and cannot isolate the Fed decision from other news that day. Daily closes miss intraday swings. Where a provider lacks history (e.g. free crypto history is limited to ~1 year), values show “—”.</div>
    {l.loading ? <Loading /> : <div className="card">{l.env?.data.events.slice().reverse().map(e => <Row key={e.date} e={e} />)}</div>}
    {l.env && <p className="text-[11px] text-mute">Decision list compiled from <a className="text-info" href={l.env.data.sourceUrl} target="_blank" rel="noopener noreferrer">federalreserve.gov</a>; verify before relying on it.</p>}</div>);
}
