"use client";
import { useMemo, useState } from "react";
import { Banner, Loading } from "@/components/ui";
import { useCalendar } from "@/lib/hooks";
import { COUNTRY_NAMES } from "@/lib/countries";
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
export default function Events() {
  const c = useCalendar(); const [view, setView] = useState("week"); const [country, setCountry] = useState(""); const [imp, setImp] = useState(""); const [kind, setKind] = useState("");
  const list = useMemo(() => { const now = new Date(); const t0 = new Date(now); t0.setHours(0, 0, 0, 0);
    const inView = (d: Date) => view === "today" ? sameDay(d, now) : view === "tomorrow" ? sameDay(d, new Date(+now + 864e5)) : view === "week" ? d >= t0 && +d - +t0 < 7 * 864e5 : d >= t0 && +d - +t0 < 31 * 864e5;
    return c.events.filter(e => inView(new Date(e.date)) && (!country || e.country === country) && (!imp || e.impact === imp) && (!kind || e.kind === kind)); }, [c.events, view, country, imp, kind]);
  const byDay = list.reduce<Record<string, typeof list>>((m, e) => { const k = new Date(e.date).toDateString(); (m[k] ??= []).push(e); return m; }, {});
  return (<div className="space-y-4"><h1 className="text-xl font-bold">Global Political & Economic Calendar</h1>
    <Banner errors={c.env?.errors} source={c.env?.source} at={c.env?.fetchedAt} />
    <div className="flex flex-wrap gap-2">{["today", "tomorrow", "week", "month"].map(v => <button key={v} className={`btn ${view === v ? "!border-info text-info" : ""}`} onClick={() => setView(v)}>{v}</button>)}
      <select className="inp" value={country} onChange={e => setCountry(e.target.value)}><option value="">All countries</option>{Object.entries(COUNTRY_NAMES).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
      <select className="inp" value={imp} onChange={e => setImp(e.target.value)}><option value="">Any impact</option><option>high</option><option>medium</option><option>low</option></select>
      <select className="inp" value={kind} onChange={e => setKind(e.target.value)}><option value="">All types</option><option value="central-bank">Central bank</option><option value="economic">Economic data</option><option value="political">Political</option></select></div>
    {c.loading && !c.events.length ? <Loading /> : Object.keys(byDay).length ? Object.entries(byDay).map(([d, es]) => <section key={d}><h2 className="text-sm font-semibold text-mute mb-1.5">{new Date(d).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</h2>
      <div className="card divide-y divide-line">{es.map(e => <div key={e.id} className="p-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"><span className={`chip ${e.impact === "high" ? "text-down" : e.impact === "medium" ? "text-warn" : ""}`}>{e.impact}</span><span className="chip">{e.country}</span>
        <span className="font-medium flex-1 min-w-[12rem]">{e.title}</span>{!e.date.includes("T00:00:00Z") && <span className="text-xs text-mute">{new Date(e.date).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}</span>}
        {(e.forecast || e.previous) && <span className="text-xs text-mute num">F: {e.forecast ?? "—"} · P: {e.previous ?? "—"}</span>}<span className={`chip ${e.status === "released" ? "" : "text-info"}`}>{e.status}</span>
        <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-info">{e.source} ↗</a></div>)}</div></section>) : <p className="text-mute">No events in this view from the available sources.</p>}</div>);
}
