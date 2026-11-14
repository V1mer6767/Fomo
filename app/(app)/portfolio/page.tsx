"use client";
import { useEffect, useState } from "react";
import { Change, Donut, PriceChart, AssetIcon } from "@/components/ui";
import { fmtPrice, useQuotes } from "@/lib/hooks";
import { PORTFOLIO0, usePortfolio } from "@/lib/userdata";
import { ASSETS } from "@/lib/assets";
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
export default function Portfolio() {
  const [p, setP] = usePortfolio(); const { byId, env } = useQuotes(); const [id, setId] = useState("BTC"); const [amt, setAmt] = useState(""); const [err, setErr] = useState("");
  const px = (a: string) => byId[a]?.price ?? null;
  const equity = p.cash + p.positions.reduce((s, x) => s + x.qty * (px(x.asset) ?? x.avg), 0);
  useEffect(() => { if (!env || env.demo) return; setP(cur => { const last = cur.equity.at(-1); if (last && Date.now() - last.t <= 5 * 60_000) return cur; const eq = cur.cash + cur.positions.reduce((s, x) => s + x.qty * (px(x.asset) ?? x.avg), 0); return { ...cur, equity: [...cur.equity, { t: Date.now(), v: eq }].slice(-500) }; }); }, [env]); // eslint-disable-line
  const trade = (side: "buy" | "sell") => {
    setErr(""); const price = px(id); const usdAmt = +amt;
    if (env?.demo) return setErr("Trading is disabled while demo data is shown."); if (price == null) return setErr("No live price for this asset."); if (!(usdAmt > 0)) return setErr("Enter an amount in USD.");
    const qty = usdAmt / price; const pos = p.positions.find(x => x.asset === id);
    if (side === "buy") { if (usdAmt > p.cash) return setErr("Not enough virtual cash."); const nq = (pos?.qty ?? 0) + qty; const navg = ((pos?.qty ?? 0) * (pos?.avg ?? 0) + usdAmt) / nq;
      setP({ ...p, cash: p.cash - usdAmt, positions: [...p.positions.filter(x => x.asset !== id), { asset: id, qty: nq, avg: navg }], trades: [{ at: new Date().toISOString(), asset: id, side, qty, price }, ...p.trades].slice(0, 200) }); }
    else { if (!pos || qty > pos.qty + 1e-9) return setErr("You don't hold that much."); const rest = pos.qty - qty;
      setP({ ...p, cash: p.cash + usdAmt, positions: rest > 1e-9 ? p.positions.map(x => x.asset === id ? { ...x, qty: rest } : x) : p.positions.filter(x => x.asset !== id), trades: [{ at: new Date().toISOString(), asset: id, side, qty, price }, ...p.trades].slice(0, 200) }); }
    setAmt("");
  };
  return (<div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold tracking-tight">Portfolio <span className="grad-text">Simulator</span></h1><span className="chip text-warn">SIMULATED — virtual money only, no brokerage</span></div>
    <div className="grid sm:grid-cols-3 gap-3"><div className="card rise p-4"><div className="text-xs text-mute">Total value</div><div className="text-2xl num font-semibold">{usd(equity)}</div></div><div className="card rise p-4"><div className="text-xs text-mute">Virtual cash</div><div className="text-2xl num font-semibold">{usd(p.cash)}</div></div><div className="card rise p-4"><div className="text-xs text-mute">Virtual P/L</div><div className="text-2xl"><Change v={((equity - p.start) / p.start) * 100} /></div></div></div>
    <section className="card p-4 flex flex-wrap gap-2 items-end"><select className="inp" value={id} onChange={e => setId(e.target.value)}>{ASSETS.filter(a => a.id !== "DXY").map(a => <option key={a.id} value={a.id}>{a.symbol} {px(a.id) != null ? "· " + fmtPrice(px(a.id)) : "· n/a"}</option>)}</select>
      <input className="inp w-36" type="number" placeholder="Amount (USD)" value={amt} onChange={e => setAmt(e.target.value)} /><button className="btn-p" onClick={() => trade("buy")}>Simulate buy</button><button className="btn" onClick={() => trade("sell")}>Simulate sell</button>
      <button className="btn ml-auto" onClick={() => confirm("Reset the simulated portfolio?") && setP(PORTFOLIO0)}>Reset</button>{err && <div className="w-full text-xs text-down">{err}</div>}</section>
    <div className="grid gap-5 xl:grid-cols-12">
      <section className="card rise p-5 xl:col-span-7"><div className="mb-2 text-[13px] font-semibold">Performance</div>{p.equity.length > 1 ? <PriceChart data={p.equity.map(e => ({ t: e.t, c: e.v }))} h={260} /> : <p className="text-sm text-mute">Performance is recorded each time you open this page with live data; check back later.</p>}</section>
      <section className="card rise p-5 xl:col-span-5"><div className="mb-3 text-[13px] font-semibold">Asset allocation</div><Donut size={150} data={[{ name: "Cash", value: p.cash }, ...p.positions.map(x => ({ name: ASSETS.find(a => a.id === x.asset)?.symbol ?? x.asset, value: x.qty * (px(x.asset) ?? x.avg) }))].filter(d => d.value > 0)} center={<div><div className="text-[10px] text-mute">Total</div><div className="num text-[13px] font-bold">{equity.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</div></div>} /></section></div>
    <section className="card overflow-x-auto"><table className="w-full text-sm"><thead className="text-[11px] uppercase text-mute"><tr className="text-left"><th className="p-3">Position</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Avg</th><th className="p-3 text-right">Now</th><th className="p-3 text-right">P/L</th></tr></thead><tbody>{p.positions.map(x => { const n = px(x.asset); return <tr key={x.asset} className="border-t border-line"><td className="p-3"><span className="flex items-center gap-2"><AssetIcon id={x.asset} size={24} />{ASSETS.find(a => a.id === x.asset)?.symbol}</span></td><td className="p-3 text-right num">{x.qty.toPrecision(5)}</td><td className="p-3 text-right num">{fmtPrice(x.avg)}</td><td className="p-3 text-right num">{fmtPrice(n)}</td><td className="p-3 text-right"><Change v={n ? ((n - x.avg) / x.avg) * 100 : null} /></td></tr>; })}{!p.positions.length && <tr><td className="p-4 text-mute" colSpan={5}>No positions.</td></tr>}</tbody></table></section></div>);
}
