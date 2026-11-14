"use client";
import { usePrefs } from "@/lib/userdata";
import { useState } from "react";
import Link from "next/link";
import { Change, Loading, PriceChart } from "./ui";
import { fmtPrice, useApi, useQuotes } from "@/lib/hooks";
import { asset } from "@/lib/assets";

const CHIPS = ["BTC", "ETH", "SOL", "SPX", "EURUSD", "XAU"];
const RANGES: { k: string; tf: string; days: number }[] = [{ k: "Intraday", tf: "15m", days: 1 }, { k: "7D", tf: "1d", days: 7 }, { k: "30D", tf: "1d", days: 30 }, { k: "90D", tf: "1d", days: 90 }, { k: "1Y", tf: "1d", days: 365 }];
/** Large featured price chart with asset selector and time-range selector. */
export default function FeaturedChart() {
  const { byId } = useQuotes(); const [prefs] = usePrefs(); const [idOv, setId] = useState<string | null>(null); const id = idOv ?? prefs.defaultAsset; const [r, setR] = useState(RANGES[2]);
  const q = byId[id]; const hist = useApi<{ t: number; c: number }[]>(`/api/history?id=${id}&tf=${r.tf}&days=${r.days}`, r.tf !== "1d" ? 60_000 : 0);
  return (<section className="card rise p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2 text-sm text-mute"><Link href={`/assets/${id}`} className="hover:text-fg">{asset(id)?.name}</Link></div>
        <div className="mt-1 flex flex-wrap items-baseline gap-3"><span className="num text-3xl font-bold">{fmtPrice(q?.price)}</span><span className="text-sm"><Change v={q?.change24h} /> <span className="text-mute">24h</span></span></div></div>
      <div className="flex flex-wrap gap-1.5">{RANGES.map(x => <button key={x.k} className={`btn ${r.k === x.k ? "btn-on" : ""}`} onClick={() => setR(x)}>{x.k}</button>)}</div></div>
    <div className="mt-3 flex flex-wrap gap-1.5">{CHIPS.map(c => <button key={c} className={`btn ${id === c ? "btn-on" : ""}`} onClick={() => setId(c)}>{asset(c)?.symbol}</button>)}</div>
    <div className="mt-3">{hist.loading ? <Loading n={3} /> : hist.error ? <p className="p-6 text-sm text-mute">Chart unavailable: {hist.error}</p> : <PriceChart data={hist.env?.data ?? []} h={300} intraday={r.tf !== "1d"} />}</div>
  </section>);
}
