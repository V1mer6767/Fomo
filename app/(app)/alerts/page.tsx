"use client";
import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ASSETS } from "@/lib/assets";
import { ago } from "@/lib/hooks";
import { type AlertRule, useAlertLog, useAlertRules } from "@/lib/userdata";
const KINDS: [AlertRule["kind"], string][] = [["price-above", "Price at or above"], ["price-below", "Price at or below"], ["move-24h", "24h move larger than (%)"], ["news-keyword", "News mentions keyword"], ["high-importance", "High-importance event (optionally for an asset)"]];
export default function Alerts() {
  const [rules, setRules] = useAlertRules(); const [log, setLog] = useAlertLog();
  const [kind, setKind] = useState<AlertRule["kind"]>("price-above"); const [asset, setAsset] = useState("BTC"); const [value, setValue] = useState(""); const [kw, setKw] = useState("");
  const needsAsset = ["price-above", "price-below", "move-24h"].includes(kind); const needsVal = needsAsset; 
  const add = () => { if (needsVal && !(+value > 0)) return; if (kind === "news-keyword" && !kw.trim()) return;
    setRules([...rules, { id: String(Date.now()), kind, asset: needsAsset || (kind === "high-importance" && asset !== "ANY") ? asset : undefined, value: needsVal ? +value : undefined, keyword: kind === "news-keyword" ? kw.trim() : undefined, enabled: true }]); setValue(""); setKw(""); };
  const perm = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
  return (<div className="space-y-5"><h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
    <section className="card p-4 flex flex-wrap gap-2 items-end">
      <select className="inp" value={kind} onChange={e => setKind(e.target.value as any)}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      {(needsAsset || kind === "high-importance") && <select className="inp" value={asset} onChange={e => setAsset(e.target.value)}>{kind === "high-importance" && <option value="ANY">Any asset</option>}{ASSETS.map(a => <option key={a.id} value={a.id}>{a.symbol}</option>)}</select>}
      {needsVal && <input className="inp w-32" type="number" placeholder="Value" value={value} onChange={e => setValue(e.target.value)} />}
      {kind === "news-keyword" && <input className="inp" placeholder="keyword e.g. tariff" value={kw} onChange={e => setKw(e.target.value)} />}
      <button className="btn-p" onClick={add}>Add rule</button>
      {perm === "default" && <button className="btn" onClick={() => Notification.requestPermission().then(() => location.reload())}>Enable browser notifications</button>}</section>
    <section><h2 className="font-semibold mb-2">Rules</h2><div className="card divide-y divide-line">{rules.map(r => <div key={r.id} className="p-3 flex items-center gap-3 text-sm"><input type="checkbox" checked={r.enabled} onChange={e => setRules(rules.map(x => x.id === r.id ? { ...x, enabled: e.target.checked } : x))} />
      <span className="flex-1">{KINDS.find(k => k[0] === r.kind)?.[1]} {r.asset && <b>{ASSETS.find(a => a.id === r.asset)?.symbol}</b>} {r.value != null && <b>{r.value}</b>} {r.keyword && <b>“{r.keyword}”</b>}</span>
      <button className="btn !px-2" aria-label="Delete" onClick={() => setRules(rules.filter(x => x.id !== r.id))}><Trash2 size={13} /></button></div>)}{!rules.length && <p className="p-4 text-sm text-mute">No rules yet.</p>}</div></section>
    <section><div className="flex justify-between items-center mb-2"><h2 className="font-semibold">History</h2>{log.length > 0 && <button className="btn" onClick={() => setLog([])}>Clear</button>}</div>
      <div className="card divide-y divide-line">{log.map(l => <div key={l.id} className="p-3 text-sm">{l.link ? <Link href={l.link} className="hover:text-info">{l.text}</Link> : l.text}<div className="text-[11px] text-mute">{ago(l.at)}</div></div>)}{!log.length && <p className="p-4 text-sm text-mute">Nothing triggered yet.</p>}</div></section></div>);
}
