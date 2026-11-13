"use client";
import Link from "next/link";
import { Banner, Change, Loading, NewsCard, Spark } from "@/components/ui";
import { fmtPrice, useNews, useQuotes } from "@/lib/hooks";
export default function Forex() {
  const { quotes, env, loading } = useQuotes(); const n = useNews();
  const rows = quotes.filter(q => q.cls === "forex" && q.id !== "DXY");
  const explain = (sym: string, c: number | null) => { if (c == null) return "No change data."; const [b, qt] = sym.split("/"); const t = Math.abs(c) < 0.05 ? "little changed" : c > 0 ? `${b} strengthened against ${qt}` : `${qt} strengthened against ${b}`; return t; };
  const news = n.events.filter(e => e.assets.some(a => /USD|JPY|CHF|CAD|DXY/.test(a)) || e.category === "central-banks").slice(0, 6);
  return (<div className="space-y-5"><h1 className="text-xl font-bold">Forex Monitor</h1>
    <Banner demo={env?.demo} errors={env?.errors} stale={env?.stale} source="ExchangeRate-API (open) + ECB reference rates (Frankfurter)" at={env?.fetchedAt} />
    <p className="text-xs text-mute">Forex rates are daily reference / delayed prices, not tick data. “24h” is the change vs the previous ECB reference day.</p>
    {loading && !rows.length ? <Loading n={5} /> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map(q => <Link key={q.id} href={`/assets/${q.id}`} className="card p-4 hover:border-info/60"><div className="flex justify-between"><div><div className="font-semibold">{q.symbol}</div><div className="text-[11px] text-mute">{q.name}</div></div><div className="text-right"><div className="num text-lg">{fmtPrice(q.price)}</div><Change v={q.change24h} /></div></div>
      <Spark data={q.spark} up={(q.change7d ?? 0) >= 0} h={40} /><div className="text-xs text-mute mt-1">{explain(q.symbol, q.change24h)} · 7d <Change v={q.change7d} /></div></Link>)}</div>}
    <section><h2 className="font-semibold mb-2">Currency-moving news</h2><div className="grid lg:grid-cols-2 gap-3">{news.map(e => <NewsCard key={e.id} a={e.articles[0]} compact />)}{!news.length && <p className="text-sm text-mute">None right now.</p>}</div></section></div>);
}
