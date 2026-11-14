"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { BarChart3, ChevronLeft, ChevronRight, Landmark, Sparkles, Vote } from "lucide-react";
import { AssetCard, Banner, Donut, DirBadge, ImpactMeter, Loading, NewsCard, Pipeline, QuoteRow, AssetIcon } from "@/components/ui";
import FeaturedChart from "@/components/FeaturedChart";
import Live from "@/components/Live";
import { ago, fmtPct, useCalendar, useNews, useQuotes } from "@/lib/hooks";
import { PORTFOLIO0, useAlertLog, usePortfolio, useWatchlist } from "@/lib/userdata";
import { asset } from "@/lib/assets";
import { usePanel } from "@/components/Panel";

const Card = ({ title, href, right, children, cls = "" }: { title: React.ReactNode; href?: string; right?: React.ReactNode; children: React.ReactNode; cls?: string }) => (
  <section className={`card rise ${cls}`}><div className="card-h"><span>{title}</span><span className="flex items-center gap-2">{right}{href && <Link href={href} className="text-xs font-medium text-info hover:underline">View all →</Link>}</span></div><div className="pb-3">{children}</div></section>);
const MARKET = ["BTC", "ETH", "SOL", "XRP", "EURUSD", "GBPUSD", "XAU"];
const KIND_ICON = { "central-bank": Landmark, economic: BarChart3, political: Vote } as const;

export default function Overview() {
  const qs = useQuotes(); const news = useNews(); const cal = useCalendar(); const w = useWatchlist(); const [log] = useAlertLog(); const [pf] = usePortfolio(); const panel = usePanel();
  const [evTab, setEvTab] = useState<"sched" | "pol">("sched"); const [sel, setSel] = useState(0);
  const top = useMemo(() => [...news.events].sort((a, b) => b.impactScore - a.impactScore || +new Date(b.latest) - +new Date(a.latest)).slice(0, 5), [news.events]);
  const focus = top[Math.min(sel, Math.max(0, top.length - 1))];
  const heads = useMemo(() => news.articles.slice(0, 6), [news.articles]);
  const upcoming = cal.events.filter(e => +new Date(e.date) >= Date.now() - 3600e3).slice(0, 5);
  const political = news.events.filter(e => ["elections", "politics", "wars", "trade"].includes(e.category)).slice(0, 5);
  const idx = qs.quotes.filter(q => q.cls === "index" || q.cls === "commodity");
  const equity = pf.cash + pf.positions.reduce((s, x) => s + x.qty * (qs.byId[x.asset]?.price ?? x.avg), 0); const pl = equity - pf.start;
  const alloc = [{ name: "Cash", value: pf.cash }, ...pf.positions.map(x => ({ name: asset(x.asset)?.symbol ?? x.asset, value: x.qty * (qs.byId[x.asset]?.price ?? x.avg) }))].filter(d => d.value > 0);
  const AI = focus?.analysis;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="text-2xl font-bold tracking-tight">Market <span className="grad-text">Overview</span></h1></div><Live at={qs.env?.fetchedAt} demo={qs.env?.demo} /></div>
      <Banner demo={qs.env?.demo || news.env?.demo} errors={[...(qs.env?.errors ?? []), ...(news.env?.errors ?? [])]} stale={qs.env?.stale} />

      {/* A. Market overview */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {qs.loading && !qs.quotes.length ? Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-panel2/70" />) : MARKET.map(id => qs.byId[id] ? <AssetCard key={id} q={qs.byId[id]} label={id === "XAU" ? "GOLD" : undefined} /> : null)}
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8"><FeaturedChart />
          {/* 5. News → Asset → Impact */}
          <section className="card rise p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-[13px] font-semibold"><Sparkles size={15} className="text-violet" />News <span className="text-info">→</span> Related assets <span className="text-info">→</span> AI impact</div>
              <Link href="/news" className="text-xs font-medium text-info hover:underline">All news →</Link></div>
            {top.length ? <>
              <div className="mb-3 flex flex-wrap gap-1.5">{top.map((e, i) => <button key={e.id} onClick={() => setSel(i)} className={`btn max-w-[15rem] !whitespace-normal text-left ${i === sel ? "btn-on" : ""}`}><span className="line-clamp-1">{e.title}</span></button>)}</div>
              {focus && <Pipeline ev={focus} quotes={qs.byId} />}</> : <Loading n={2} />}
          </section>

        {/* B. Global news */}
        <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-semibold">Global News</h2><Link href="/news" className="text-xs font-medium text-info hover:underline">View all →</Link></div>
          {news.loading && !heads.length ? <Loading n={4} /> : <div className="grid gap-3 md:grid-cols-2">{heads.map(a => <NewsCard key={a.id} a={a} />)}</div>}
          {!news.loading && !heads.length && <p className="text-sm text-mute">No news loaded.</p>}</section>

        </div>

        <div className="space-y-5 xl:col-span-4">
          <section className="card card-ai rise p-5">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[13px] font-semibold"><Sparkles size={15} className="text-pink" />AI Intelligence</div>
              {top.length > 1 && <div className="flex gap-1"><button className="btn !px-1.5" aria-label="Previous" onClick={() => setSel((sel + top.length - 1) % top.length)}><ChevronLeft size={13} /></button><button className="btn !px-1.5" aria-label="Next" onClick={() => setSel((sel + 1) % top.length)}><ChevronRight size={13} /></button></div>}</div>
            {focus && AI ? <div className="mt-3 space-y-3 text-sm">
              <button className="text-left font-semibold leading-snug hover:text-cyan" onClick={() => panel.open(focus.id)}>{focus.title}</button>
              <div className="flex flex-wrap items-center gap-2"><ImpactMeter score={focus.impactScore} /><span className="chip">{focus.status}</span></div>
              <div><div className="mb-1 text-[11px] uppercase tracking-wider text-mute">Related assets</div><div className="flex flex-wrap gap-1.5">{AI.impacts.slice(0, 6).map(i => <Link key={i.asset} href={`/assets/${i.asset}`} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel/60 py-0.5 pl-0.5 pr-2.5 text-xs hover:border-info/70"><AssetIcon id={i.asset} size={20} />{asset(i.asset)?.symbol}</Link>)}{!AI.impacts.length && <span className="text-mute">None identified</span>}</div></div>
              <div><div className="mb-1 text-[11px] uppercase tracking-wider text-mute">Potential market impact</div><div className="space-y-1.5">{AI.impacts.slice(0, 3).map(i => <div key={i.asset} className="flex items-center justify-between gap-2 rounded-xl bg-panel/50 px-3 py-1.5"><span>{asset(i.asset)?.symbol}</span><DirBadge v={i.direction} /></div>)}</div></div>
              {AI.scenarios[2] && <div><div className="mb-1 text-[11px] uppercase tracking-wider text-mute">Alternative scenario</div><p className="text-xs text-mute">{AI.scenarios[2].description}</p></div>}
              <div className="rounded-xl bg-panel/50 p-3 text-xs"><b className="text-mute">Source quality & confidence: </b><span className="uppercase">{AI.sections.confidence.level}</span> — {focus.sources.length} source(s), {focus.status}.</div>
              <div className="flex gap-2"><button className="btn-p" onClick={() => panel.open(focus.id)}>Detailed analysis</button><Link href="/intelligence" className="btn">All insights</Link></div></div> : <div className="mt-3"><Loading n={3} /></div>}
          </section>
          {/* D. Global events */}
          <Card title="Global Events" href="/events" right={<div className="flex gap-1">{(["sched", "pol"] as const).map(t => <button key={t} className={`btn !px-2.5 !py-1 ${evTab === t ? "btn-on" : ""}`} onClick={() => setEvTab(t)}>{t === "sched" ? "Scheduled" : "Political"}</button>)}</div>}>
            <div className="space-y-1 px-3">{evTab === "sched" ? (upcoming.length ? upcoming.map(e => { const I = KIND_ICON[e.kind]; return (<div key={e.id} className="flex items-start gap-3 rounded-xl p-2 transition hover:bg-panel2/70"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-info/20 text-info"><I size={15} /></span><div className="min-w-0 flex-1"><div className="text-sm leading-snug">{e.title}</div><div className="text-[11px] text-mute">{e.country} · {new Date(e.date).toLocaleDateString("en", { month: "short", day: "numeric" })}{e.date.includes("T00:00:00Z") ? "" : " " + new Date(e.date).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}</div></div><span className={`chip ${e.impact === "high" ? "!text-down" : e.impact === "medium" ? "!text-warn" : ""}`}>{e.impact}</span></div>); }) : <p className="p-2 text-sm text-mute">No upcoming events loaded.</p>)
              : (political.length ? political.map(e => <button key={e.id} onClick={() => panel.open(e.id)} className="flex w-full items-start gap-3 rounded-xl p-2 text-left transition hover:bg-panel2/70"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-pink/20 text-pink"><Vote size={15} /></span><div className="min-w-0"><div className="text-sm leading-snug">{e.title}</div><div className="text-[11px] text-mute">{e.category}{e.country ? " · " + e.country : ""} · {ago(e.latest)}</div></div></button>) : <p className="p-2 text-sm text-mute">No political headlines right now.</p>)}</div>
          </Card>

          {/* E. Portfolio simulator */}
          <Card title={<>Portfolio Simulator <span className="chip ml-1 !text-warn">SIMULATED</span></>} href="/portfolio">
            <div className="px-5"><div className="flex items-baseline justify-between"><div className="num text-2xl font-bold">{equity.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</div><div className={`text-sm font-semibold num ${pl >= 0 ? "text-up" : "text-down"}`}>{pl >= 0 ? "+" : ""}{pl.toLocaleString("en-US", { maximumFractionDigits: 0 })} <span className="text-mute font-normal">({fmtPct((pl / pf.start) * 100)})</span></div></div>
              <div className="mt-3"><Donut size={110} data={alloc.length ? alloc : [{ name: "Cash", value: PORTFOLIO0.cash }]} /></div>
              {pf.equity.length > 1 && <div className="mt-3 h-14"><ResponsiveContainer><AreaChart data={pf.equity}><YAxis hide domain={["auto", "auto"]} /><Tooltip contentStyle={{ background: "rgb(var(--panel))", border: "1px solid rgb(var(--info) / .5)", borderRadius: 12, fontSize: 12 }} labelFormatter={t => new Date(t as number).toLocaleString()} formatter={(v: any) => [Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }), "Value"]} /><Area type="monotone" dataKey="v" stroke="rgb(var(--info))" fill="rgb(var(--info))" fillOpacity={0.18} strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div>}</div>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Global Markets" href="/assets">{idx.length ? idx.map(q => <QuoteRow key={q.id} q={q} />) : <p className="px-5 text-sm text-mute">{qs.loading ? "Loading…" : "Index/commodity feed unavailable."}</p>}</Card>
        <Card title="Watchlist" href="/watchlist">{w.list.slice(0, 6).map(id => qs.byId[id] ? <QuoteRow key={id} q={qs.byId[id]} /> : null)}{!w.list.length && <p className="px-5 text-sm text-mute">Empty.</p>}</Card>
        <Card title="Recent Alerts" href="/alerts"><div className="space-y-2 px-5 text-sm">{log.slice(0, 4).map(l => <div key={l.id} className="rounded-xl bg-panel2/50 p-2.5">{l.text}<div className="text-[11px] text-mute">{ago(l.at)}</div></div>)}{!log.length && <span className="text-mute">No alerts triggered. Create rules under Alerts.</span>}</div></Card>
      </div>
    </div>);
}
