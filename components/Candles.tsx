"use client";
import { useEffect, useRef, useState } from "react";
import { fmtPrice } from "@/lib/hooks";

export interface OhlcBar { t: number; o?: number; h?: number; l?: number; c: number }
/** Candlestick chart (SVG). Falls back to a note when the provider has no OHLC data. */
export default function Candles({ data, h = 300 }: { data: OhlcBar[]; h?: number }) {
  const ref = useRef<HTMLDivElement>(null); const [w, setW] = useState(600); const [hover, setHover] = useState<number | null>(null);
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect(); }, []);
  const bars = data.filter(b => b.o != null && b.h != null && b.l != null);
  if (bars.length < 3) return <div className="text-mute text-sm p-6">Candlestick data isn’t available for this asset from the current provider — use the line view.</div>;
  const padL = 56, padR = 8, padT = 8, padB = 22; const iw = Math.max(50, w - padL - padR), ih = h - padT - padB;
  const lo = Math.min(...bars.map(b => b.l!)), hi = Math.max(...bars.map(b => b.h!)); const span = hi - lo || 1;
  const y = (v: number) => padT + (1 - (v - lo) / span) * ih; const step = iw / bars.length; const bw = Math.max(1, Math.min(14, step * 0.7));
  const ticks = Array.from({ length: 5 }, (_, i) => lo + (span * i) / 4);
  const hb = hover != null ? bars[hover] : bars.at(-1)!;
  const fmtD = (t: number) => new Date(t).toLocaleDateString("en", { month: "short", day: "numeric" });
  return (<div ref={ref} className="w-full">
    <div className="text-[11px] text-mute num mb-1 flex flex-wrap gap-x-3"><span>{new Date(hb.t).toLocaleDateString()}</span><span>O {fmtPrice(hb.o)}</span><span>H {fmtPrice(hb.h)}</span><span>L {fmtPrice(hb.l)}</span><span className={hb.c >= hb.o! ? "text-up" : "text-down"}>C {fmtPrice(hb.c)}</span></div>
    <svg width={w} height={h} onMouseLeave={() => setHover(null)} onMouseMove={e => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const i = Math.floor((e.clientX - r.left - padL) / step); setHover(i >= 0 && i < bars.length ? i : null); }}>
      {ticks.map((t, i) => <g key={i}><line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="rgb(var(--line))" strokeWidth={0.5} /><text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="rgb(var(--mute))">{fmtPrice(t)}</text></g>)}
      {bars.map((b, i) => { const x = padL + step * i + step / 2; const up = b.c >= b.o!; const col = up ? "rgb(var(--up))" : "rgb(var(--down))"; const top = y(Math.max(b.o!, b.c)), bot = y(Math.min(b.o!, b.c));
        return <g key={i}><line x1={x} x2={x} y1={y(b.h!)} y2={y(b.l!)} stroke={col} strokeWidth={1} /><rect x={x - bw / 2} y={top} width={bw} height={Math.max(1, bot - top)} fill={col} opacity={hover === i ? 1 : 0.9} /></g>; })}
      {[0, Math.floor(bars.length / 2), bars.length - 1].map(i => <text key={i} x={padL + step * i + step / 2} y={h - 6} textAnchor={i === 0 ? "start" : i === bars.length - 1 ? "end" : "middle"} fontSize={10} fill="rgb(var(--mute))">{fmtD(bars[i].t)}</text>)}
    </svg></div>);
}
