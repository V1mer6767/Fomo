"use client";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { ago, fmtPct, fmtPrice } from "@/lib/hooks";
import { asset } from "@/lib/assets";
import type { Article, AssetImpact, Direction, EventGroup, Importance, Quote, Status } from "@/lib/types";
import { Star } from "lucide-react";
import { useWatchlist } from "@/lib/userdata";

export const Change = ({ v }: { v: number | null | undefined }) => <span className={`num font-medium ${v == null ? "text-mute" : v >= 0 ? "text-up" : "text-down"}`}>{fmtPct(v)}</span>;

export function Spark({ data, up, h = 36 }: { data?: number[]; up: boolean; h?: number }) {
  if (!data || data.length < 3) return <div style={{ height: h }} />;
  const c = up ? "rgb(var(--up))" : "rgb(var(--down))";
  return <div style={{ height: h }}><ResponsiveContainer width="100%" height="100%"><LineChart data={data.map((v, i) => ({ i, v }))}><YAxis hide domain={["dataMin", "dataMax"]} /><Line dataKey="v" stroke={c} strokeWidth={1.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>;
}
export function PriceChart({ data, h = 260 }: { data: { t: number; c: number }[]; h?: number }) {
  if (!data.length) return <div className="text-mute text-sm p-6">No chart data available.</div>;
  const up = data.at(-1)!.c >= data[0].c; const c = up ? "rgb(var(--up))" : "rgb(var(--down))";
  return <div style={{ height: h }}><ResponsiveContainer><AreaChart data={data}><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={0.3} /><stop offset="100%" stopColor={c} stopOpacity={0} /></linearGradient></defs>
    <XAxis dataKey="t" tickFormatter={t => new Date(t).toLocaleDateString("en", { month: "short", day: "numeric" })} stroke="rgb(var(--mute))" fontSize={10} minTickGap={40} />
    <YAxis domain={["auto", "auto"]} stroke="rgb(var(--mute))" fontSize={10} width={52} tickFormatter={v => fmtPrice(v)} />
    <Tooltip contentStyle={{ background: "rgb(var(--panel2))", border: "1px solid rgb(var(--line))", borderRadius: 8, fontSize: 12 }} labelFormatter={t => new Date(t as number).toLocaleString()} formatter={(v: any) => [fmtPrice(v), "Price"]} />
    <Area dataKey="c" stroke={c} strokeWidth={2} fill="url(#g)" isAnimationActive={false} /></AreaChart></ResponsiveContainer></div>;
}
export function Banner({ demo, errors, stale, source, at }: { demo?: boolean; errors?: string[]; stale?: boolean; source?: string; at?: string }) {
  return (<div className="space-y-1.5">
    {demo && <div className="rounded-lg border border-warn/50 bg-warn/10 px-3 py-2 text-xs text-warn">DEMO DATA — live providers were unreachable. Values shown are illustrative placeholders, not real market data or news.</div>}
    {stale && !demo && <div className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">Showing last cached data — the provider is currently unavailable.</div>}
    {!!errors?.length && !demo && <details className="text-[11px] text-mute"><summary className="cursor-pointer">{errors.length} source(s) unavailable</summary><ul className="mt-1 list-disc pl-4">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></details>}
    {source && <div className="text-[11px] text-mute">Source: {source}{at ? ` · updated ${ago(at)}` : ""}</div>}
  </div>);
}
export const Loading = ({ n = 3 }: { n?: number }) => <div className="space-y-2">{Array.from({ length: n }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-panel2 animate-pulse" />)}</div>;

export function ImpactMeter({ score, compact }: { score: number; compact?: boolean }) {
  const lvl = score >= 65 ? { t: "Strong impact", c: "bg-down", x: "text-down" } : score >= 35 ? { t: "Moderate impact", c: "bg-warn", x: "text-warn" } : { t: "Weak impact", c: "bg-mute", x: "text-mute" };
  const on = Math.max(1, Math.ceil(score / 20));
  return (<span className="inline-flex items-center gap-1.5" title={`Potential to move markets: ${score}/100 (estimate from story type, directly linked assets and source count — not a forecast)`}>
    <span className="flex items-end gap-[2px]">{[0, 1, 2, 3, 4].map(i => <span key={i} className={`w-[4px] rounded-sm ${i < on ? lvl.c : "bg-line"}`} style={{ height: 5 + i * 3 }} />)}</span>
    <span className={`text-[11px] font-semibold ${lvl.x}`}>{compact ? lvl.t.replace(" impact", "") : lvl.t}</span></span>);
}
const impCls: Record<Importance, string> = { low: "text-mute", medium: "text-info", high: "text-warn", critical: "text-down" };
export const ImpBadge = ({ v }: { v: Importance }) => <span className={`chip ${impCls[v]} uppercase`}>{v}</span>;
const stCls: Record<Status, string> = { confirmed: "text-up", developing: "text-warn", unverified: "text-down" };
export const StatusBadge = ({ v }: { v: Status }) => <span className={`chip ${stCls[v]}`}>{v}</span>;
const dirCls: Record<Direction, string> = { positive: "text-up border-up/40 bg-up/10", negative: "text-down border-down/40 bg-down/10", mixed: "text-warn border-warn/40 bg-warn/10", uncertain: "text-mute border-line bg-panel2" };
export const DirBadge = ({ v }: { v: Direction }) => <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase ${dirCls[v]}`}>{v}</span>;

export function StarBtn({ id }: { id: string }) { const w = useWatchlist(); return <button className="btn !px-2" onClick={() => w.toggle(id)} aria-label="Watchlist"><Star size={14} className={w.has(id) ? "fill-warn text-warn" : ""} />{w.has(id) ? "Watching" : "Watch"}</button>; }

export function QuoteRow({ q }: { q: Quote }) {
  return (<Link href={`/assets/${q.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-panel2 rounded-lg">
    <div className="w-24 min-w-0"><div className="text-sm font-semibold truncate">{q.symbol}</div><div className="text-[11px] text-mute truncate">{q.name}</div></div>
    <div className="w-20 hidden sm:block"><Spark data={q.spark} up={(q.change7d ?? q.change24h ?? 0) >= 0} h={26} /></div>
    <div className="ml-auto text-right"><div className="num text-sm">{fmtPrice(q.price)}</div><div className="text-xs"><Change v={q.change24h} /></div></div>
  </Link>);
}

export function NewsCard({ a, compact }: { a: Article; compact?: boolean }) {
  return (<div className="card p-4">
    <div className="flex flex-wrap items-center gap-1.5 mb-1.5"><ImpactMeter score={a.impactScore} /><ImpBadge v={a.importance} /><StatusBadge v={a.status} /><span className="chip">{a.category}</span>{a.country && <span className="chip">{a.country}</span>}</div>
    <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-semibold leading-snug hover:text-info">{a.title}</a>
    {!compact && a.summary && <p className="mt-1 text-sm text-mute line-clamp-3">{a.summary}</p>}
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-mute"><span>{a.source}</span><span>·</span><time title={a.publishedAt}>{ago(a.publishedAt)} ({new Date(a.publishedAt).toLocaleString()})</time>
      <Link href={`/news/${a.eventId}`} className="ml-auto text-info hover:underline">Event & impact →</Link></div>
    {a.assets.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{a.assets.slice(0, 6).map(x => <Link key={x} href={`/assets/${x}`} className="chip hover:text-fg">{asset(x)?.symbol ?? x}</Link>)}</div>}
  </div>);
}

export function ImpactCard({ i, q }: { i: AssetImpact; q?: Quote }) {
  const a = asset(i.asset);
  return (<div className="card p-4">
    <div className="flex items-start justify-between gap-2"><div><Link href={`/assets/${i.asset}`} className="font-semibold hover:text-info">{a?.symbol ?? i.asset}</Link><span className="ml-2 text-xs text-mute">{a?.name}</span></div>
      <div className="flex gap-1.5 items-center"><span className="chip">{i.directness}</span><DirBadge v={i.direction} /></div></div>
    {q?.price != null && <div className="mt-1 text-xs text-mute num">Now {fmtPrice(q.price)} · 24h <Change v={q.change24h} /></div>}
    <p className="mt-2 text-sm"><b className="text-mute">Mechanism: </b>{i.mechanism}</p>
    <p className="mt-1.5 text-sm"><b className="text-mute">Could differ if: </b>{i.alternative}</p>
    <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
      <div><div className="text-mute uppercase tracking-wide text-[10px] mb-0.5">Factors that could change the outcome</div><ul className="list-disc pl-4 space-y-0.5">{i.factors.map(f => <li key={f}>{f}</li>)}</ul></div>
      <div><div className="text-mute uppercase tracking-wide text-[10px] mb-0.5">What to monitor</div><ul className="list-disc pl-4 space-y-0.5">{i.monitor.map(f => <li key={f}>{f}</li>)}</ul></div></div>
  </div>);
}

export function Pipeline({ ev, quotes }: { ev: EventGroup & { analysis: any }; quotes: Record<string, Quote> }) {
  const imps: AssetImpact[] = ev.analysis.impacts;
  return (<div className="grid lg:grid-cols-[1fr_auto_1.2fr_auto_1.6fr] gap-3 items-stretch">
    <div className="card p-4"><div className="text-[10px] uppercase tracking-wider text-info mb-1">① News</div><div className="font-semibold text-sm">{ev.title}</div><div className="mt-1 text-xs text-mute">{ev.sources.length} source(s) · <StatusBadge v={ev.status} /></div></div>
    <div className="hidden lg:grid place-items-center text-mute">→</div>
    <div className="card p-4"><div className="text-[10px] uppercase tracking-wider text-info mb-1">② Affected assets</div>
      {imps.length ? <div className="flex flex-wrap gap-1.5">{imps.map(i => <Link key={i.asset} href={`/assets/${i.asset}`} className="chip hover:text-fg">{asset(i.asset)?.symbol ?? i.asset}<span className={`ml-1 ${i.directness === "direct" ? "text-info" : ""}`}>{i.directness === "direct" ? "●" : "○"}</span></Link>)}</div> : <div className="text-sm text-mute">No market channel identified.</div>}
      <div className="mt-2 text-[10px] text-mute">● direct ○ indirect</div></div>
    <div className="hidden lg:grid place-items-center text-mute">→</div>
    <div className="card p-4"><div className="text-[10px] uppercase tracking-wider text-info mb-1">③ Possible impact</div>
      <div className="space-y-1">{imps.slice(0, 5).map(i => <div key={i.asset} className="flex items-center justify-between text-sm"><span>{asset(i.asset)?.symbol ?? i.asset}</span><DirBadge v={i.direction} /></div>)}</div>
      <div className="mt-2 text-[10px] text-mute">Scenarios, not forecasts. Details below.</div></div>
  </div>);
}
