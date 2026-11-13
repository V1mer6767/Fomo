"use client";
import { use, useState } from "react";
import Link from "next/link";
import { Banner, Change, ImpactCard, Loading, NewsCard, PriceChart, StarBtn } from "@/components/ui";
import { fmtBig, fmtPrice, ago, useApi, useCalendar, useNews, useQuotes } from "@/lib/hooks";
import { asset as getAsset } from "@/lib/assets";

export default function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const def = getAsset(id); const { byId, env, loading } = useQuotes(); const n = useNews(); const cal = useCalendar(); const [days, setDays] = useState(90);
  const hist = useApi<{ t: number; c: number }[]>(def && def.id !== "DXY" ? `/api/history?id=${id}&days=${days}` : null);
  if (!def) return <p className="text-mute">Unknown asset. <Link href="/assets" className="text-info">Back</Link></p>;
  const q = byId[id]; const related = n.events.filter(e => e.assets.includes(id)).slice(0, 6);
  const impacts = related.flatMap(e => e.analysis.impacts.filter(i => i.asset === id).map(i => ({ i, e }))).slice(0, 4);
  const evts = cal.events.filter(e => e.assets?.includes(id) && +new Date(e.date) > Date.now() - 864e5).slice(0, 5);
  return (<div className="space-y-5">
    <Link href="/assets" className="text-xs text-info">← Assets</Link>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold">{def.symbol} <span className="text-base font-normal text-mute">{def.name}</span></h1>
      {q ? <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1"><span className="text-3xl num font-semibold">{fmtPrice(q.price)}</span><span>24h <Change v={q.change24h} /></span><span>7d <Change v={q.change7d} /></span>{q.volume != null && <span className="text-sm text-mute">Vol {fmtBig(q.volume)}</span>}{q.marketCap != null && <span className="text-sm text-mute">Mkt cap {fmtBig(q.marketCap)}</span>}</div> : loading ? <Loading n={1} /> : <p className="text-sm text-mute mt-1">No live quote available for this asset right now.</p>}
      {q && <div className="text-[11px] text-mute mt-1">{q.source} · as of {ago(q.asOf)}{q.delayed ? " · delayed" : ""}</div>}</div><StarBtn id={id} /></div>
    <Banner demo={env?.demo} errors={env?.errors} />
    <section className="card p-4"><div className="flex gap-2 mb-2">{[30, 90, 365].map(d => <button key={d} className={`btn ${days === d ? "!border-info text-info" : ""}`} onClick={() => setDays(d)}>{d === 365 ? "1Y" : d + "D"}</button>)}</div>
      {hist.loading ? <Loading n={2} /> : hist.error ? <p className="text-sm text-mute">Chart unavailable: {hist.error}</p> : <PriceChart data={hist.env?.data ?? []} />}</section>
    <section><h2 className="font-semibold mb-2">AI impact — what current news could mean</h2>{impacts.length ? <div className="grid gap-3 lg:grid-cols-2">{impacts.map(({ i, e }) => <div key={e.id}><Link href={`/news/${e.id}`} className="text-xs text-info">{e.title}</Link><ImpactCard i={i} /></div>)}</div> : <p className="text-sm text-mute">No current news events map to this asset.</p>}</section>
    <div className="grid gap-5 lg:grid-cols-2">
      <section><h2 className="font-semibold mb-2">Related news</h2><div className="space-y-3">{related.length ? related.slice(0, 4).map(e => <NewsCard key={e.id} a={e.articles[0]} compact />) : <p className="text-sm text-mute">None right now.</p>}</div></section>
      <section><h2 className="font-semibold mb-2">Related events</h2><div className="space-y-2">{evts.length ? evts.map(e => <div key={e.id} className="card p-3 text-sm">{e.title}<div className="text-[11px] text-mute">{new Date(e.date).toLocaleDateString()} · {e.country} · {e.status}</div></div>) : <p className="text-sm text-mute">No scheduled events linked to this asset.</p>}
        <Link href="/history" className="btn">Historical comparisons →</Link></div></section></div>
  </div>);
}
