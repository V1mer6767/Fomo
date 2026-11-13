"use client";
import { useSetting } from "@/lib/storage";
import { useApi } from "@/lib/hooks";
export default function Settings() {
  const [theme, setTheme] = useSetting<"dark" | "light">("theme", "dark"); const q = useApi<any[]>("/api/quotes"); const nw = useApi<any>("/api/news");
  return (<div className="space-y-5 max-w-2xl"><h1 className="text-xl font-bold">Settings</h1>
    <section className="card p-4"><div className="font-semibold mb-2">Appearance</div><div className="flex gap-2">{(["dark", "light"] as const).map(t => <button key={t} className={`btn ${theme === t ? "!border-info text-info" : ""}`} onClick={() => setTheme(t)}>{t}</button>)}</div></section>
    <section className="card p-4 text-sm space-y-1"><div className="font-semibold mb-2">Data sources</div>
      <div>Quotes: {q.env?.demo ? "DEMO" : q.env ? "live" : "…"} <span className="text-mute">— {q.env?.source}</span></div>{q.env?.errors?.map(e => <div key={e} className="text-xs text-warn">{e}</div>)}
      <div>News: {nw.env?.demo ? "DEMO" : nw.env ? "live" : "…"} <span className="text-mute">— {nw.env?.source}</span></div>{nw.env?.errors?.map((e: string) => <div key={e} className="text-xs text-warn">{e}</div>)}</section>
    <section className="card p-4"><div className="font-semibold mb-2">Local data</div><button className="btn" onClick={() => { if (confirm("Delete watchlist, portfolio, alerts and settings stored in this browser?")) { Object.keys(localStorage).filter(k => k.startsWith("fomo:")).forEach(k => localStorage.removeItem(k)); location.reload(); } }}>Reset all local data</button></section></div>);
}
