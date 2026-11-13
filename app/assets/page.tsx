"use client";
import Link from "next/link";
import { useState } from "react";
import { Banner, Change, Loading, Spark } from "@/components/ui";
import { fmtBig, fmtPrice, useQuotes } from "@/lib/hooks";
export default function Assets() {
  const { quotes, env, loading } = useQuotes(); const [f, setF] = useState("all");
  const rows = quotes.filter(q => f === "all" || q.cls === f);
  return (<div className="space-y-4"><h1 className="text-xl font-bold">Asset Intelligence</h1>
    <div className="flex gap-2 flex-wrap">{["all", "crypto", "forex", "commodity", "index"].map(c => <button key={c} className={`btn ${f === c ? "!border-info text-info" : ""}`} onClick={() => setF(c)}>{c}</button>)}</div>
    <Banner demo={env?.demo} errors={env?.errors} stale={env?.stale} source={env?.source} at={env?.fetchedAt} />
    {loading && !quotes.length ? <Loading n={6} /> : <div className="card overflow-x-auto"><table className="w-full text-sm"><thead className="text-[11px] uppercase text-mute"><tr className="text-left"><th className="p-3">Asset</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">24h</th><th className="p-3 text-right">7d</th><th className="p-3 hidden md:table-cell">Trend</th><th className="p-3 text-right hidden md:table-cell">Volume</th></tr></thead>
      <tbody>{rows.map(q => <tr key={q.id} className="border-t border-line hover:bg-panel2"><td className="p-3"><Link href={`/assets/${q.id}`} className="font-semibold hover:text-info">{q.symbol}</Link><div className="text-[11px] text-mute">{q.name}</div></td>
        <td className="p-3 text-right num">{fmtPrice(q.price)}</td><td className="p-3 text-right"><Change v={q.change24h} /></td><td className="p-3 text-right"><Change v={q.change7d} /></td>
        <td className="p-3 w-32 hidden md:table-cell"><Spark data={q.spark} up={(q.change7d ?? 0) >= 0} h={28} /></td><td className="p-3 text-right num hidden md:table-cell">{fmtBig(q.volume)}</td></tr>)}</tbody></table></div>}
    <p className="text-[11px] text-mute">Index and commodity data are end-of-day (delayed). Forex uses ECB reference rates plus a delayed public feed.</p></div>);
}
