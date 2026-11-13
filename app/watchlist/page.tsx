"use client";
import Link from "next/link";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Change, Spark } from "@/components/ui";
import { fmtPrice, useQuotes } from "@/lib/hooks";
import { useWatchlist } from "@/lib/userdata";
import { ASSETS } from "@/lib/assets";
export default function Watchlist() {
  const w = useWatchlist(); const { byId } = useQuotes();
  return (<div className="space-y-4"><h1 className="text-xl font-bold">Watchlist</h1>
    <select className="inp" value="" onChange={e => e.target.value && w.toggle(e.target.value)}><option value="">+ Add asset…</option>{ASSETS.filter(a => !w.has(a.id)).map(a => <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>)}</select>
    <div className="card divide-y divide-line">{w.list.map(id => { const q = byId[id]; const a = ASSETS.find(x => x.id === id); return (<div key={id} className="flex items-center gap-3 p-3">
      <div className="flex flex-col"><button aria-label="Up" onClick={() => w.move(id, -1)}><ArrowUp size={13} /></button><button aria-label="Down" onClick={() => w.move(id, 1)}><ArrowDown size={13} /></button></div>
      <Link href={`/assets/${id}`} className="min-w-0 flex-1"><div className="font-semibold">{a?.symbol ?? id}</div><div className="text-[11px] text-mute">{a?.name}</div></Link>
      <div className="w-24 hidden sm:block"><Spark data={q?.spark} up={(q?.change7d ?? 0) >= 0} h={28} /></div>
      <div className="text-right"><div className="num">{fmtPrice(q?.price)}</div><Change v={q?.change24h} /></div><button className="btn !px-2" aria-label="Remove" onClick={() => w.toggle(id)}><X size={13} /></button></div>); })}
      {!w.list.length && <p className="p-4 text-sm text-mute">Your watchlist is empty.</p>}</div></div>);
}
