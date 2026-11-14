"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ASSETS } from "@/lib/assets";
import { COUNTRY_NAMES, CATEGORIES } from "@/lib/countries";
import { useApi } from "@/lib/hooks";

export default function GlobalSearch() {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const r = useRouter();
  const news = useApi<{ events: any[] }>(open ? "/api/news" : null);
  const res = useMemo(() => {
    const s = q.trim().toLowerCase(); if (s.length < 2) return [];
    const out: { label: string; sub: string; href: string }[] = [];
    ASSETS.filter(a => (a.name + a.symbol + a.aliases.join(" ")).toLowerCase().includes(s)).slice(0, 5).forEach(a => out.push({ label: a.symbol, sub: `Asset · ${a.name}`, href: `/assets/${a.id}` }));
    Object.entries(COUNTRY_NAMES).filter(([c, n]) => n.toLowerCase().includes(s) || c.toLowerCase() === s).slice(0, 3).forEach(([c, n]) => out.push({ label: n, sub: "Country", href: `/news?country=${c}` }));
    CATEGORIES.filter(c => c.includes(s)).slice(0, 3).forEach(c => out.push({ label: c, sub: "Topic", href: `/news?cat=${c}` }));
    (news.env?.data.events ?? []).filter((e: any) => e.articles.some((a: any) => (a.title + " " + a.summary).toLowerCase().includes(s))).slice(0, 6).forEach((e: any) => out.push({ label: e.title, sub: "News event (presidents, elections, companies, topics…)", href: `/news/${e.id}` }));
    return out;
  }, [q, news.env]);
  return (
    <div className="relative w-full max-w-md">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
      <input className="inp w-full !rounded-full !pl-9" placeholder="Search assets, news, countries…" value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && q.trim().length >= 2 && (
        <div className="pop absolute mt-2 w-full min-w-[280px] rounded-2xl border border-info/40 bg-panel shadow-[0_20px_50px_-15px_rgba(139,92,246,.55)] max-h-80 overflow-y-auto z-50">
          {res.length ? res.map((x, i) => <button key={i} className="block w-full text-left px-3 py-2 hover:bg-panel2" onMouseDown={() => { setQ(""); r.push(x.href); }}>
            <div className="text-sm truncate">{x.label}</div><div className="text-[11px] text-mute">{x.sub}</div></button>) : <div className="p-3 text-sm text-mute">{news.loading ? "Searching…" : "No results"}</div>}
        </div>)}
    </div>);
}
