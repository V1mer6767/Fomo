"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Banner, Loading, NewsCard } from "@/components/ui";
import Live from "@/components/Live";
import { useNews } from "@/lib/hooks";
import { ASSETS } from "@/lib/assets";
import { CATEGORIES, COUNTRY_NAMES } from "@/lib/countries";

function Inner() {
  const sp = useSearchParams(); const n = useNews();
  const [cat, setCat] = useState(sp.get("cat") ?? ""); const [country, setCountry] = useState(sp.get("country") ?? "");
  const [imp, setImp] = useState(""); const [asset, setAsset] = useState(""); const [days, setDays] = useState("3"); const [q, setQ] = useState("");
  const list = useMemo(() => n.articles.filter(a => (!cat || a.category === cat) && (!country || a.country === country) && (!imp || a.importance === imp) && (!asset || a.assets.includes(asset))
    && Date.now() - +new Date(a.publishedAt) <= +days * 864e5 && (!q || (a.title + a.summary).toLowerCase().includes(q.toLowerCase()))), [n.articles, cat, country, imp, asset, days, q]);
  const Sel = ({ v, set, ph, opts }: { v: string; set: (s: string) => void; ph: string; opts: [string, string][] }) => <select className="inp" value={v} onChange={e => set(e.target.value)}><option value="">{ph}</option>{opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
  return (<div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">Live News</h1><Live at={n.env?.fetchedAt} demo={n.env?.demo} /></div>
    <Banner demo={n.env?.demo} errors={n.env?.errors} stale={n.env?.stale} source={n.env?.source} at={n.env?.fetchedAt} />
    <div className="flex flex-wrap gap-2">
      <input className="inp" placeholder="Filter text…" value={q} onChange={e => setQ(e.target.value)} />
      <Sel v={cat} set={setCat} ph="All categories" opts={CATEGORIES.map(c => [c, c])} />
      <Sel v={country} set={setCountry} ph="All countries" opts={Object.entries(COUNTRY_NAMES)} />
      <Sel v={imp} set={setImp} ph="Any importance" opts={[["critical", "critical"], ["high", "high"], ["medium", "medium"], ["low", "low"]]} />
      <Sel v={asset} set={setAsset} ph="Any asset" opts={ASSETS.map(a => [a.id, a.symbol])} />
      <Sel v={days} set={setDays} ph="" opts={[["1", "Last 24h"], ["3", "Last 3 days"]]} />
    </div>
    <div className="text-xs text-mute">{list.length} articles · {n.events.length} events (similar reports are grouped)</div>
    {n.loading && !n.articles.length ? <Loading n={5} /> : <div className="grid gap-3 lg:grid-cols-2">{list.slice(0, 80).map(a => <NewsCard key={a.id} a={a} />)}</div>}
    {!n.loading && !list.length && <p className="text-mute">No articles match these filters.</p>}
  </div>);
}
export default function Page() { return <Suspense><Inner /></Suspense>; }
