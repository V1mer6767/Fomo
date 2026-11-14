"use client";
import Link from "next/link";
import { useState } from "react";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { ago, fmtPct, fmtPrice } from "@/lib/hooks";
import { asset } from "@/lib/assets";
import type { Article, AssetImpact, Direction, EventGroup, Importance, Quote, Status } from "@/lib/types";
import { Bookmark, BookmarkCheck, ChevronDown, ExternalLink, Sparkles, Star } from "lucide-react";
import { usePanel } from "./Panel";
import { useFavorites, useSavedAnalyses, useSavedNews, useWatchlist } from "@/lib/userdata";

export const Change = ({ v }: { v: number | null | undefined }) => <span className={`num font-medium ${v == null ? "text-mute" : v >= 0 ? "text-up" : "text-down"}`}>{fmtPct(v)}</span>;

const TT = { background: "rgb(var(--panel))", border: "1px solid rgb(var(--info) / .5)", borderRadius: 12, fontSize: 12, boxShadow: "0 10px 30px -10px rgba(139,92,246,.5)" };
let gid = 0;
export function Spark({ data, up, h = 36, interactive = false }: { data?: number[]; up: boolean; h?: number; interactive?: boolean }) {
  if (!data || data.length < 3) return <div style={{ height: h }} />;
  const c = up ? "rgb(var(--up))" : "rgb(var(--down))";
  return <div style={{ height: h }}><ResponsiveContainer width="100%" height="100%"><LineChart data={data.map((v, i) => ({ i, v }))}><YAxis hide domain={["dataMin", "dataMax"]} />
    {interactive && <Tooltip contentStyle={TT} cursor={{ stroke: "rgb(var(--info))", strokeWidth: 1 }} formatter={(v: any) => [fmtPrice(v), ""]} labelFormatter={() => ""} separator="" />}
    <Line type="monotone" dataKey="v" stroke={c} strokeWidth={1.8} dot={false} activeDot={interactive ? { r: 3, fill: c } : false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>;
}
/** Smooth brand-gradient price chart with tooltip. */
export function PriceChart({ data, h = 260, intraday = false }: { data: { t: number; c: number }[]; h?: number; intraday?: boolean }) {
  const [id] = useState(() => `pc${++gid}`);
  if (!data.length) return <div className="text-mute text-sm p-6">No chart data available.</div>;
  return <div style={{ height: h }}><ResponsiveContainer><AreaChart data={data} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}><defs>
      <linearGradient id={`${id}f`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="rgb(var(--pink))" stopOpacity={0.38} /><stop offset="55%" stopColor="rgb(var(--info))" stopOpacity={0.16} /><stop offset="100%" stopColor="rgb(var(--info))" stopOpacity={0} /></linearGradient>
      <linearGradient id={`${id}s`} x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="rgb(var(--cyan))" /><stop offset="45%" stopColor="rgb(var(--info))" /><stop offset="100%" stopColor="rgb(var(--pink))" /></linearGradient></defs>
    <XAxis dataKey="t" tickLine={false} axisLine={false} tickFormatter={t => intraday ? new Date(t).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }) : new Date(t).toLocaleDateString("en", { month: "short", day: "numeric" })} stroke="rgb(var(--mute))" fontSize={10} minTickGap={44} />
    <YAxis orientation="right" domain={["auto", "auto"]} tickLine={false} axisLine={false} stroke="rgb(var(--mute))" fontSize={10} width={54} tickFormatter={v => fmtPrice(v)} />
    <Tooltip contentStyle={TT} cursor={{ stroke: "rgb(var(--info))", strokeDasharray: "3 3" }} labelFormatter={t => new Date(t as number).toLocaleString()} formatter={(v: any) => [fmtPrice(v), "Price"]} />
    <Area type="monotone" dataKey="c" stroke={`url(#${id}s)`} strokeWidth={2.4} fill={`url(#${id}f)`} activeDot={{ r: 5, fill: "#fff", stroke: "rgb(var(--info))", strokeWidth: 2 }} animationDuration={600} /></AreaChart></ResponsiveContainer></div>;
}
export const PALETTE = ["#8B5CF6", "#EC4899", "#67DCEB", "#A855F7", "#22C55E", "#F59E0B", "#3B82F6", "#F04462"];
export function Donut({ data, size = 150, center }: { data: { name: string; value: number }[]; size?: number; center?: React.ReactNode }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (<div className="flex flex-wrap items-center gap-4">
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer><PieChart><Pie data={data} dataKey="value" innerRadius="66%" outerRadius="100%" paddingAngle={data.length > 1 ? 2 : 0} stroke="none" startAngle={90} endAngle={-270} animationDuration={600}>
        {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie>
        <Tooltip contentStyle={TT} formatter={(v: any, n: any) => [`${((v / total) * 100).toFixed(1)}%`, n]} /></PieChart></ResponsiveContainer>
      {center && <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">{center}</div>}</div>
    <ul className="min-w-[140px] flex-1 space-y-1.5 text-sm">{data.map((d, i) => <li key={d.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} /><span className="flex-1 truncate">{d.name}</span><span className="num text-mute">{total ? ((d.value / total) * 100).toFixed(1) : "0.0"}%</span></li>)}</ul></div>);
}
/* ---------- Asset logos: official crypto logos (cryptocurrency-icons / Simple Icons, CC0), country flags (flag-icons, MIT), vector commodity icons ---------- */
const CRYPTO_LOGOS = new Set(["btc", "eth", "sol", "xrp", "bnb", "ada", "doge", "ton"]);
const FLAG: Record<string, string> = { EUR: "eu", USD: "us", GBP: "gb", JPY: "jp", CHF: "ch", AUD: "au", CAD: "ca", NZD: "nz" };
const INDEX_FLAG: Record<string, string> = { SPX: "us", NDX: "us", DJI: "us", DAX: "de", DXY: "us" };
function Flag({ code, size, ring }: { code: string; size: number; ring?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/logos/flags/${code}.svg`} alt="" width={size} height={size} draggable={false} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size, boxShadow: ring ? "0 0 0 2px rgb(var(--bg))" : "0 0 0 1px rgba(255,255,255,.12)" }} />;
}
function CryptoLogo({ id, size }: { id: string; size: number }) {
  const [bad, setBad] = useState(false); const k = id.toLowerCase();
  if (bad || !CRYPTO_LOGOS.has(k)) return <span className="grid shrink-0 place-items-center rounded-full bg-panel2 font-bold text-mute" style={{ width: size, height: size, fontSize: size * 0.32 }}>{id.slice(0, 3)}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/logos/crypto/${k}.svg`} alt={id} width={size} height={size} draggable={false} onError={() => setBad(true)} className="shrink-0" style={{ width: size, height: size }} />;
}
const Bar = ({ x, y, w, h, g }: { x: number; y: number; w: number; h: number; g: string }) => (<g><path d={`M${x + 3} ${y} H${x + w - 3} L${x + w} ${y + h} H${x} Z`} fill={`url(#${g})`} stroke="rgba(0,0,0,.35)" strokeWidth=".8" strokeLinejoin="round" /><path d={`M${x + 5} ${y + 2.2} H${x + w - 5}`} stroke="rgba(255,255,255,.55)" strokeWidth="1.2" strokeLinecap="round" /></g>);
function Ingots({ kind, size }: { kind: "gold" | "silver"; size: number }) {
  const g = kind === "gold" ? "gGold" : "gSilver"; const [c1, c2] = kind === "gold" ? ["#FFE27A", "#C58A12"] : ["#F4F6F9", "#8E98A6"];
  return <svg width={size} height={size} viewBox="2 10 44 36" className="shrink-0" aria-label={kind === "gold" ? "Gold" : "Silver"}><defs><linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs>
    <Bar x={4} y={29} w={21} h={11} g={g} /><Bar x={23} y={29} w={21} h={11} g={g} /><Bar x={13.5} y={16} w={21} h={11} g={g} /></svg>;
}
function Barrel({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" className="shrink-0" aria-label="Oil"><defs><linearGradient id="gOil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8A4B0F" /><stop offset=".45" stopColor="#F2A33A" /><stop offset="1" stopColor="#8A4B0F" /></linearGradient></defs>
    <path d="M13 6h22c2.5 0 4 1.5 4 4v28c0 2.5-1.5 4-4 4H13c-2.5 0-4-1.5-4-4V10c0-2.5 1.5-4 4-4z" fill="url(#gOil)" stroke="rgba(0,0,0,.4)" strokeWidth=".8" />
    <path d="M9 14h30M9 24h30M9 34h30" stroke="#2A1A07" strokeWidth="2.2" opacity=".75" /><path d="M24 17.5c2.2 2.6 3.4 4.2 3.4 6a3.4 3.4 0 0 1-6.8 0c0-1.8 1.2-3.4 3.4-6z" fill="#1B1206" opacity=".85" /></svg>;
}
function Flame({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" className="shrink-0" aria-label="Natural gas"><defs><linearGradient id="gFl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7DD3FC" /><stop offset="1" stopColor="#2563EB" /></linearGradient></defs>
    <path d="M24 4c1.5 7 11.5 11 11.5 24a11.5 11.5 0 0 1-23 0c0-6 3.8-8.6 5.8-14.5 1.6 3.4 3.4 3.6 4.5 1.8C23.6 12.4 24 8.4 24 4z" fill="url(#gFl)" />
    <path d="M24 24c.8 3.5 5.5 5.4 5.5 10.2a5.5 5.5 0 0 1-11 0c0-3 1.8-4.2 3-7 .8 1.7 1.7 1.8 2.5.9.3-1.1 0-2.6 0-4.1z" fill="#E0F2FE" opacity=".92" /></svg>;
}
/** Authentic asset logo: crypto brand logos, flag pairs for forex, vector icons for commodities. */
export function AssetIcon({ id, size = 36 }: { id: string; size?: number }) {
  const def = asset(id);
  if (def?.cls === "crypto") return <CryptoLogo id={id} size={size} />;
  if (def?.pair) { const f = def.pair.map(c => FLAG[c]); const fs = Math.round(size * 0.76);
    return <span className="relative inline-block shrink-0" style={{ width: Math.round(size * 1.38), height: size }} aria-label={def.symbol}><span className="absolute left-0" style={{ top: (size - fs) / 2 }}><Flag code={f[0]} size={fs} ring /></span><span className="absolute right-0" style={{ top: (size - fs) / 2 }}><Flag code={f[1]} size={fs} ring /></span></span>; }
  if (id === "XAU") return <Ingots kind="gold" size={size} />;
  if (id === "XAG") return <Ingots kind="silver" size={size} />;
  if (id === "WTI") return <Barrel size={size} />;
  if (id === "NG") return <Flame size={size} />;
  if (INDEX_FLAG[id]) return <Flag code={INDEX_FLAG[id]} size={size} />;
  return <span className="grid shrink-0 place-items-center rounded-full bg-panel2 font-bold text-mute" style={{ width: size, height: size, fontSize: size * 0.32 }}>{id.slice(0, 3)}</span>;
}
/** Market overview card: icon, name, price, 24h change, interactive sparkline. */
export function AssetCard({ q, label }: { q: Quote; label?: string }) {
  const up = (q.change24h ?? 0) >= 0;
  return (<Link href={`/assets/${q.id}`} className="card lift rise block p-4">
    <div className="flex items-center gap-2.5"><AssetIcon id={q.id} /><div className="min-w-0"><div className="truncate text-sm font-semibold">{label ?? q.symbol}</div><div className="truncate text-[11px] text-mute">{q.name}</div></div></div>
    <div className="mt-3 flex items-end justify-between gap-2"><div className="num text-lg font-semibold leading-none">{fmtPrice(q.price)}</div>
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold num ${q.change24h == null ? "bg-panel2 text-mute" : up ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>{fmtPct(q.change24h)}</span></div>
    <div className="mt-2" onClick={e => e.preventDefault()}><Spark data={q.spark} up={up} h={38} interactive /></div>
  </Link>);
}
export function Banner({ demo, errors, stale, source, at }: { demo?: boolean; errors?: string[]; stale?: boolean; source?: string; at?: string }) {
  return (<div className="space-y-1.5">
    {demo && <div className="rounded-xl border border-warn/50 bg-warn/10 px-3 py-2 text-xs text-warn">DEMO DATA — live providers were unreachable. Values shown are illustrative placeholders, not real market data or news.</div>}
    {stale && !demo && <div className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">Showing last cached data — the provider is currently unavailable.</div>}
    {!!errors?.length && !demo && <details className="text-[11px] text-mute"><summary className="cursor-pointer">{errors.length} source(s) unavailable</summary><ul className="mt-1 list-disc pl-4">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></details>}
    {source && <div className="text-[11px] text-mute">Source: {source}{at ? ` · updated ${ago(at)}` : ""}</div>}
  </div>);
}
export const Loading = ({ n = 3 }: { n?: number }) => <div className="space-y-2">{Array.from({ length: n }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-panel2/70" />)}</div>;

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
  return (<Link href={`/assets/${q.id}`} className="mx-2 flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-panel2/80">
    <AssetIcon id={q.id} size={30} /><div className="w-24 min-w-0"><div className="text-sm font-semibold truncate">{q.symbol}</div><div className="text-[11px] text-mute truncate">{q.name}</div></div>
    <div className="w-20 hidden sm:block"><Spark data={q.spark} up={(q.change7d ?? q.change24h ?? 0) >= 0} h={26} /></div>
    <div className="ml-auto text-right"><div className="num text-sm">{fmtPrice(q.price)}</div><div className="text-xs"><Change v={q.change24h} /></div></div>
  </Link>);
}

export function NewsCard({ a, compact }: { a: Article; compact?: boolean }) {
  const panel = usePanel(); const [open, setOpen] = useState(false);
  return (<div className="card lift rise p-4">
    <div className="mb-2 flex flex-wrap items-center gap-1.5"><ImpactMeter score={a.impactScore} /><ImpBadge v={a.importance} /><StatusBadge v={a.status} /><span className="chip">{a.category}</span>{a.country && <span className="chip">{a.country}</span>}</div>
    <button onClick={() => panel.open(a.eventId)} className="text-left font-semibold leading-snug transition hover:text-info">{a.title}</button>
    {!compact && a.summary && <p className={`mt-1.5 text-sm text-mute ${open ? "" : "line-clamp-2"}`}>{a.summary}</p>}
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-mute"><span>{a.source}</span><span>·</span><time title={new Date(a.publishedAt).toLocaleString()}>{ago(a.publishedAt)}</time>
      <button className="ml-auto inline-flex items-center gap-1 text-info hover:underline" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Less" : "More"}<ChevronDown size={12} className={`transition ${open ? "rotate-180" : ""}`} /></button></div>
    {a.assets.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{a.assets.slice(0, open ? 12 : 5).map(x => <Link key={x} href={`/assets/${x}`} className="chip transition hover:border-info/60 hover:text-fg">{asset(x)?.symbol ?? x}</Link>)}</div>}
    {open && <div className="fade-in mt-3 flex flex-wrap gap-2 border-t border-line/70 pt-3"><button className="btn-p" onClick={() => panel.open(a.eventId)}>AI impact analysis</button><a className="btn" href={a.url} target="_blank" rel="noopener noreferrer">Source <ExternalLink size={12} /></a><Link className="btn" href={`/news/${a.eventId}`}>Full page</Link><SaveNewsBtn a={a} /></div>}
  </div>);
}

export function ImpactCard({ i, q }: { i: AssetImpact; q?: Quote }) {
  const a = asset(i.asset);
  return (<div className="card rise p-4">
    <div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2"><AssetIcon id={i.asset} size={28} /><Link href={`/assets/${i.asset}`} className="font-semibold hover:text-info">{a?.symbol ?? i.asset}</Link><span className="text-xs text-mute">{a?.name}</span></div>
      <div className="flex gap-1.5 items-center"><span className="chip">{i.directness}</span><DirBadge v={i.direction} /></div></div>
    {q?.price != null && <div className="mt-1 text-xs text-mute num">Now {fmtPrice(q.price)} · 24h <Change v={q.change24h} /></div>}
    <p className="mt-2 text-sm"><b className="text-mute">Mechanism: </b>{i.mechanism}</p>
    <p className="mt-1.5 text-sm"><b className="text-mute">Could differ if: </b>{i.alternative}</p>
    <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
      <div><div className="text-mute uppercase tracking-wide text-[10px] mb-0.5">Factors that could change the outcome</div><ul className="list-disc pl-4 space-y-0.5">{i.factors.map(f => <li key={f}>{f}</li>)}</ul></div>
      <div><div className="text-mute uppercase tracking-wide text-[10px] mb-0.5">What to monitor</div><ul className="list-disc pl-4 space-y-0.5">{i.monitor.map(f => <li key={f}>{f}</li>)}</ul></div></div>
  </div>);
}

const STAGE = [{ n: 1, t: "News", g: "from-cyan to-info" }, { n: 2, t: "Related assets", g: "from-info to-violet" }, { n: 3, t: "AI impact", g: "from-violet to-pink" }];
const Stage = ({ i, children }: { i: number; children: React.ReactNode }) => (<div className="card relative p-4"><div className="mb-2.5 flex items-center gap-2"><span className={`grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white ${STAGE[i].g}`}>{STAGE[i].n}</span><span className="text-[11px] font-semibold uppercase tracking-wider text-mute">{STAGE[i].t}</span></div>{children}</div>);
const Arrow = ({ stack }: { stack?: boolean }) => <div className={`grid place-items-center text-info ${stack ? "rotate-90 py-0.5" : "hidden lg:grid"}`}>➜</div>;
/** News → Related assets → AI impact: three connected stages. */
export function Pipeline({ ev, quotes, stack }: { ev: EventGroup & { analysis: any }; quotes: Record<string, Quote>; stack?: boolean }) {
  const imps: AssetImpact[] = ev.analysis.impacts;
  return (<div className={stack ? "grid gap-1" : "grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1.1fr_auto_1.7fr]"}>
    <Stage i={0}><div className="text-sm font-semibold leading-snug">{ev.title}</div><div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-mute">{ev.sources.length} source(s) <StatusBadge v={ev.status} /></div></Stage>
    <Arrow stack={stack} />
    <Stage i={1}>{imps.length ? <div className="flex flex-wrap gap-1.5">{imps.map(i => <Link key={i.asset} href={`/assets/${i.asset}`} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel2/70 py-0.5 pl-0.5 pr-2.5 text-xs transition hover:border-info/70 hover:shadow-[0_0_14px_-3px_rgba(139,92,246,.8)]"><AssetIcon id={i.asset} size={20} />{asset(i.asset)?.symbol ?? i.asset}<span className={i.directness === "direct" ? "text-info" : "text-mute"}>{i.directness === "direct" ? "●" : "○"}</span></Link>)}</div> : <div className="text-sm text-mute">No market channel identified.</div>}
      <div className="mt-2.5 text-[10px] text-mute">● direct ○ indirect · click an asset to open it</div></Stage>
    <Arrow stack={stack} />
    <Stage i={2}><div className="space-y-2">{imps.slice(0, stack ? 3 : 4).map(i => <div key={i.asset} className="rounded-xl border border-line/60 bg-panel2/40 p-2.5"><div className="flex items-center justify-between gap-2 text-sm"><span className="font-medium">{asset(i.asset)?.symbol ?? i.asset}</span><DirBadge v={i.direction} /></div>{!stack && <p className="mt-1 line-clamp-2 text-xs text-mute">{i.mechanism}</p>}</div>)}{!imps.length && <div className="text-sm text-mute">Nothing to analyse.</div>}</div>
      <div className="mt-2 text-[10px] text-mute">Scenarios, not forecasts.</div></Stage>
  </div>);
}

export function FavBtn({ id }: { id: string }) { const f = useFavorites(); const on = f.has(id); return <button className="btn !px-2" onClick={() => f.toggle(id)} aria-label={on ? "Remove from favorites" : "Add to favorites"} aria-pressed={on}><Star size={14} className={on ? "fill-pink text-pink" : ""} />{on ? "Favorite" : "Favorite"}</button>; }
const evNews = (a: Article) => ({ eventId: a.eventId, title: a.title, url: a.url, source: a.source, summary: a.summary?.slice(0, 1000), category: a.category, publishedAt: a.publishedAt });
export function SaveNewsBtn({ a }: { a: Article }) { const s = useSavedNews(); const on = s.has(a.eventId);
  return <button className="btn" onClick={() => s.toggle(evNews(a))} aria-pressed={on}>{on ? <BookmarkCheck size={13} className="text-info" /> : <Bookmark size={13} />}{on ? "Saved" : "Save news"}</button>; }
export function SaveEventBtns({ ev }: { ev: EventGroup & { analysis: any } }) {
  const n = useSavedNews(); const an = useSavedAnalyses(); const a = ev.articles[0]; const onN = n.has(ev.id); const onA = an.has(ev.id);
  return (<>
    {a && <button className="btn" onClick={() => n.toggle({ ...evNews(a), eventId: ev.id, title: ev.title })} aria-pressed={onN}>{onN ? <BookmarkCheck size={13} className="text-info" /> : <Bookmark size={13} />}{onN ? "Saved" : "Save news"}</button>}
    <button className="btn" onClick={() => an.toggle({ eventId: ev.id, title: ev.title, analysis: { impactScore: ev.impactScore, category: ev.category, importance: ev.importance, status: ev.status, impacts: ev.analysis.impacts?.slice(0, 8), sections: ev.analysis.sections } })} aria-pressed={onA}><Sparkles size={13} className={onA ? "text-info" : ""} />{onA ? "Analysis saved" : "Save analysis"}</button>
  </>);
}
