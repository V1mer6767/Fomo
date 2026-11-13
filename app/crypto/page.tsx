"use client";
import Link from "next/link";
import { useState } from "react";
import { Banner, Change, Loading, NewsCard, PriceChart, Spark, StarBtn } from "@/components/ui";
import { fmtBig, fmtPrice, useApi, useNews, useQuotes } from "@/lib/hooks";
import { useWatchlist } from "@/lib/userdata";
export default function Crypto() {
  const { quotes, env, loading } = useQuotes(); const n = useNews(); const w = useWatchlist(); const [sel, setSel] = useState("BTC"); const [only, setOnly] = useState(false);
  const rows = quotes.filter(q => q.cls === "crypto" && (!only || w.has(q.id)));
  const hist = useApi<{ t: number; c: number }[]>(`/api/history?id=${sel}&days=90`);
  const news = n.events.filter(e => e.category === "crypto" || e.assets.includes("BTC")).slice(0, 6);
  const reg = n.events.filter(e => e.category === "regulation" && /crypto|bitcoin|sec|stablecoin/i.test(e.title)).slice(0, 4);
  return (<div className="space-y-5"><div className="flex justify-between flex-wrap gap-2"><h1 className="text-xl font-bold">Cryptocurrency Monitor</h1><label className="text-xs flex items-center gap-1.5"><input type="checkbox" checked={only} onChange={e => setOnly(e.target.checked)} /> My watchlist only</label></div>
    <Banner demo={env?.demo} errors={env?.errors} stale={env?.stale} source="CoinGecko (public API, rate-limited)" at={env?.fetchedAt} />
    {loading && !quotes.length ? <Loading n={5} /> : <div className="card overflow-x-auto"><table className="w-full text-sm"><thead className="text-[11px] uppercase text-mute"><tr className="text-left"><th className="p-3">Coin</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">24h</th><th className="p-3 text-right">7d</th><th className="p-3 text-right hidden md:table-cell">Market cap</th><th className="p-3 text-right hidden md:table-cell">Volume 24h</th><th className="p-3 hidden lg:table-cell">7d</th><th className="p-3" /></tr></thead>
      <tbody>{rows.map(q => <tr key={q.id} className={`border-t border-line hover:bg-panel2 cursor-pointer ${sel === q.id ? "bg-panel2" : ""}`} onClick={() => setSel(q.id)}><td className="p-3"><Link href={`/assets/${q.id}`} className="font-semibold hover:text-info">{q.symbol}</Link> <span className="text-[11px] text-mute">{q.name}</span></td>
        <td className="p-3 text-right num">${fmtPrice(q.price)}</td><td className="p-3 text-right"><Change v={q.change24h} /></td><td className="p-3 text-right"><Change v={q.change7d} /></td><td className="p-3 text-right num hidden md:table-cell">{fmtBig(q.marketCap)}</td><td className="p-3 text-right num hidden md:table-cell">{fmtBig(q.volume)}</td><td className="p-3 w-28 hidden lg:table-cell"><Spark data={q.spark} up={(q.change7d ?? 0) >= 0} h={26} /></td><td className="p-3"><StarBtn id={q.id} /></td></tr>)}</tbody></table></div>}
    <section className="card p-4"><div className="text-sm font-semibold mb-2">{sel} — 90 days</div>{hist.loading ? <Loading n={2} /> : hist.error ? <p className="text-sm text-mute">Chart unavailable: {hist.error}</p> : <PriceChart data={hist.env?.data ?? []} />}</section>
    <div className="grid lg:grid-cols-2 gap-5"><section><h2 className="font-semibold mb-2">Crypto news</h2><div className="space-y-3">{news.map(e => <NewsCard key={e.id} a={e.articles[0]} compact />)}{!news.length && <p className="text-sm text-mute">None right now.</p>}</div></section>
      <section><h2 className="font-semibold mb-2">Regulation</h2><div className="space-y-3">{reg.map(e => <NewsCard key={e.id} a={e.articles[0]} compact />)}{!reg.length && <p className="text-sm text-mute">No crypto-regulation headlines in the current feed.</p>}</div></section></div></div>);
}
