"use client";
import Link from "next/link";
import { Banner, Loading, QuoteRow, ImpBadge, StatusBadge } from "@/components/ui";
import Live from "@/components/Live";
import { ago, useCalendar, useNews, useQuotes } from "@/lib/hooks";
import { useAlertLog, useWatchlist } from "@/lib/userdata";
import { asset } from "@/lib/assets";

const Card = ({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) => (
  <section className="card"><div className="card-h"><span>{title}</span>{href && <Link href={href} className="normal-case text-info">View all →</Link>}</div><div className="pb-2">{children}</div></section>);

export default function Overview() {
  const qs = useQuotes(); const news = useNews(); const cal = useCalendar(); const w = useWatchlist(); const [log] = useAlertLog();
  const by = (cls: string, ids?: string[]) => qs.quotes.filter(q => q.cls === cls && (!ids || ids.includes(q.id)));
  const top = [...news.events].sort((a, b) => ["low", "medium", "high", "critical"].indexOf(b.importance) - ["low", "medium", "high", "critical"].indexOf(a.importance) || +new Date(b.latest) - +new Date(a.latest)).slice(0, 5);
  const geo = news.events.filter(e => ["wars", "politics", "elections", "trade"].includes(e.category)).slice(0, 4);
  const upcoming = cal.events.filter(e => +new Date(e.date) >= Date.now() - 3600e3).slice(0, 6);
  const lead = top[0];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">Market Overview</h1><Live at={qs.env?.fetchedAt} demo={qs.env?.demo} /></div>
      <Banner demo={qs.env?.demo || news.env?.demo} errors={[...(qs.env?.errors ?? []), ...(news.env?.errors ?? [])]} stale={qs.env?.stale} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Global markets" href="/assets">{qs.loading && !qs.quotes.length ? <Loading /> : by("index").concat(by("commodity")).map(q => <QuoteRow key={q.id} q={q} />)}{!qs.loading && !by("index").length && !by("commodity").length && <p className="px-4 text-sm text-mute">Index/commodity feed unavailable.</p>}</Card>
        <Card title="Crypto" href="/crypto">{by("crypto").slice(0, 5).map(q => <QuoteRow key={q.id} q={q} />)}{!by("crypto").length && !qs.loading && <p className="px-4 text-sm text-mute">Crypto feed unavailable.</p>}</Card>
        <Card title="Forex" href="/forex">{by("forex").filter(q => q.id !== "DXY").slice(0, 5).map(q => <QuoteRow key={q.id} q={q} />)}{!by("forex").length && !qs.loading && <p className="px-4 text-sm text-mute">Forex feed unavailable.</p>}</Card>
        <Card title="Breaking & top news" href="/news"><div className="px-3 space-y-2">{news.loading && !top.length ? <Loading /> : top.map(e => (
          <Link key={e.id} href={`/news/${e.id}`} className="block rounded-lg p-2 hover:bg-panel2"><div className="text-sm font-medium leading-snug">{e.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5"><ImpBadge v={e.importance} /><StatusBadge v={e.status} /><span className="text-[11px] text-mute">{e.sources.length} src · {ago(e.latest)}</span></div></Link>))}</div></Card>
        <Card title="Geopolitics" href="/news?cat=wars"><div className="px-3 space-y-1">{geo.length ? geo.map(e => <Link key={e.id} href={`/news/${e.id}`} className="block rounded-lg p-2 text-sm hover:bg-panel2">{e.title}<div className="text-[11px] text-mute">{e.category}{e.country ? " · " + e.country : ""} · {ago(e.latest)}</div></Link>) : <p className="px-1 text-sm text-mute">No geopolitical items right now.</p>}</div></Card>
        <Card title="Upcoming events" href="/events"><div className="px-3 space-y-1">{upcoming.length ? upcoming.map(e => <div key={e.id} className="rounded-lg p-2 text-sm"><div>{e.title}</div><div className="text-[11px] text-mute">{e.country} · {new Date(e.date).toLocaleDateString("en", { month: "short", day: "numeric" })}{e.date.includes("T00:00:00Z") ? "" : " " + new Date(e.date).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })} · {e.impact} impact</div></div>) : <p className="text-sm text-mute px-1">No upcoming events loaded.</p>}</div></Card>
        <Card title="Market intelligence" href="/intelligence"><div className="px-4 text-sm space-y-1.5">{lead ? <><div className="font-medium">{lead.title}</div><p className="text-mute">{lead.analysis.sections.why}</p><p><b className="text-mute">Assets: </b>{lead.analysis.impacts.slice(0, 4).map(i => asset(i.asset)?.symbol).join(", ") || "—"}</p><Link href={`/news/${lead.id}`} className="text-info text-xs">Full analysis →</Link></> : <span className="text-mute">Waiting for news…</span>}</div></Card>
        <Card title="Watchlist" href="/watchlist">{w.list.slice(0, 6).map(id => qs.byId[id] ? <QuoteRow key={id} q={qs.byId[id]} /> : null)}{!w.list.length && <p className="px-4 text-sm text-mute">Empty.</p>}</Card>
        <Card title="Recent alerts" href="/alerts"><div className="px-4 space-y-1.5 text-sm">{log.slice(0, 4).map(l => <div key={l.id}>{l.text}<div className="text-[11px] text-mute">{ago(l.at)}</div></div>)}{!log.length && <span className="text-mute">No alerts triggered. Create rules under Alerts.</span>}</div></Card>
      </div>
    </div>);
}
