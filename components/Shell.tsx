"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as I from "lucide-react";
import { NAV } from "@/lib/nav";
import { useSetting } from "@/lib/storage";
import { useAlertLog } from "@/lib/userdata";
import GlobalSearch from "./GlobalSearch";
import AlertRunner from "./AlertRunner";
import { PanelProvider } from "./Panel";
import { useAuth } from "./AuthProvider";

type Item = { href: string; label: string };
const TOP: ({ label: string; href: string } | { label: string; items: Item[] })[] = [
  { label: "Dashboard", href: "/" },
  { label: "Live News", href: "/news" },
  { label: "Markets", items: [{ href: "/assets", label: "Asset Intelligence" }, { href: "/crypto", label: "Cryptocurrency" }, { href: "/forex", label: "Forex" }] },
  { label: "AI Intelligence", href: "/intelligence" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Global Events", href: "/events" },
  { label: "More", items: [{ href: "/history", label: "Historical Comparisons" }, { href: "/watchlist", label: "Watchlist" }, { href: "/alerts", label: "Alerts" }, { href: "/settings", label: "Settings" }] },
];

function ProfileMenu() {
  const { configured, user, profile, signOut } = useAuth(); const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null); const path = usePathname();
  useEffect(() => { const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  useEffect(() => setOpen(false), [path]);
  const name = profile?.display_name || user?.email?.split("@")[0] || "Guest"; const initial = name.charAt(0).toUpperCase();
  const items = [{ href: "/profile", label: "My Profile", icon: I.User }, { href: "/settings", label: "Account Settings", icon: I.Settings }, { href: "/watchlist", label: "My Watchlist", icon: I.Star }, { href: "/portfolio", label: "My Portfolio", icon: I.Wallet }];
  return (<div ref={ref} className="relative">
    <button onClick={() => setOpen(!open)} aria-label="Profile menu" aria-expanded={open} className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet to-pink text-sm font-bold text-white shadow-[0_6px_18px_-6px_rgba(236,72,153,.8)]">
      {profile?.avatar_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : user ? initial : <I.User size={16} />}</button>
    {open && <div className="pop absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-info/40 bg-panel p-1.5 shadow-[0_20px_50px_-15px_rgba(139,92,246,.55)]">
      <div className="px-3 py-2"><div className="truncate text-sm font-semibold">{configured && user ? name : "Local mode"}</div><div className="truncate text-[11px] text-mute">{configured && user ? user.email : "Data is stored in this browser only"}</div></div>
      <div className="my-1 h-px bg-line" />
      {items.map(i => <Link key={i.href} href={i.href} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-mute hover:bg-panel2 hover:text-fg"><i.icon size={15} />{i.label}</Link>)}
      <div className="my-1 h-px bg-line" />
      {configured && user ? <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-down hover:bg-panel2"><I.LogOut size={15} />Sign Out</button>
        : configured ? <Link href="/login" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-info hover:bg-panel2"><I.LogIn size={15} />Sign in</Link>
        : <div className="px-3 py-2 text-[11px] text-mute">Set up Supabase to enable accounts (see README).</div>}
    </div>}
  </div>);
}

function SyncBanner() {
  const { syncError } = useAuth(); if (!syncError) return null;
  return <div role="alert" className="fixed bottom-3 left-1/2 z-[80] max-w-[92vw] -translate-x-1/2 rounded-xl border border-down/60 bg-panel px-4 py-2 text-xs text-down shadow-lg">{syncError}</div>;
}

function Dropdown({ label, items, path }: { label: string; items: Item[]; path: string }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  const active = items.some(i => path.startsWith(i.href));
  useEffect(() => { const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  useEffect(() => setOpen(false), [path]);
  return (<div ref={ref} className="relative">
    <button onClick={() => setOpen(!open)} className={pill(active)} aria-expanded={open}>{label}<I.ChevronDown size={13} className={`transition ${open ? "rotate-180" : ""}`} /></button>
    {open && <div className="pop absolute left-0 top-full z-50 mt-2 min-w-[210px] rounded-2xl border border-info/40 bg-panel p-1.5 shadow-[0_20px_50px_-15px_rgba(139,92,246,.55)]">
      {items.map(i => <Link key={i.href} href={i.href} className={`block rounded-xl px-3 py-2 text-sm ${path.startsWith(i.href) ? "bg-info/20 text-fg" : "text-mute hover:bg-panel2 hover:text-fg"}`}>{i.label}</Link>)}</div>}
  </div>);
}
const pill = (a: boolean) => `inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition ${a ? "text-white bg-gradient-to-r from-info to-violet shadow-[0_6px_22px_-6px_rgba(139,92,246,.9)]" : "text-mute hover:text-fg hover:bg-panel2/70"}`;

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [theme, setTheme] = useSetting<"dark" | "light">("theme", "dark");
  const [log] = useAlertLog();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => setDrawer(false), [path]);
  const Icon = (n: string) => { const C = (I as any)[n] ?? I.Circle; return <C size={17} className="shrink-0" />; };
  const isAct = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <PanelProvider>
      <div className="p-2 sm:p-4 lg:p-5">
        <div className="app-frame mx-auto w-full max-w-[1500px] min-[1800px]:max-w-[2000px] min-[2300px]:max-w-[2600px]">
          <header className="relative z-20 flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4 sm:px-6 sm:pt-5">
            <button className="lg:hidden btn !px-2.5" onClick={() => setDrawer(true)} aria-label="Menu"><I.Menu size={16} /></button>
            <Link href="/" className="flex items-center gap-2.5 mr-1">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-info to-pink shadow-[0_6px_20px_-6px_rgba(168,85,247,.9)]"><I.TrendingUp size={19} className="text-white" /></span>
              <span className="text-[17px] font-bold tracking-tight">Trade <span className="grad-text">Info</span></span>
            </Link>
            <nav className="hidden lg:flex items-center gap-1 rounded-full border border-line/70 bg-panel/70 p-1 backdrop-blur">
              {TOP.map(t => "items" in t ? <Dropdown key={t.label} label={t.label} items={t.items} path={path} /> : <Link key={t.label} href={t.href} className={pill(isAct(t.href))}>{t.label}</Link>)}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:block w-64 xl:w-80"><GlobalSearch /></div>
              <Link href="/alerts" className="btn relative !px-2.5" aria-label="Alerts"><I.Bell size={15} />{log.length > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-pink ring-2 ring-bg" />}</Link>
              <button className="btn !px-2.5" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">{theme === "dark" ? <I.Sun size={15} /> : <I.Moon size={15} />}</button>
              <Link href="/settings" className="btn hidden sm:inline-flex !px-2.5" aria-label="Settings"><I.Settings size={15} /></Link>
              <ProfileMenu />
            </div>
            <div className="md:hidden w-full"><GlobalSearch /></div>
          </header>
          {drawer && <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm fade-in" onClick={() => setDrawer(false)} />
            <aside className="slide-in absolute left-0 top-0 h-full w-72 overflow-y-auto border-r border-info/40 bg-bg p-3">
              <div className="mb-2 flex items-center justify-between px-2 pt-1"><span className="font-bold">Trade <span className="grad-text">Info</span></span><button className="btn !px-2" onClick={() => setDrawer(false)} aria-label="Close"><I.X size={14} /></button></div>
              {NAV.map(n => <Link key={n.href} href={n.href} className={`my-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${isAct(n.href) ? "bg-gradient-to-r from-info to-violet text-white" : "text-mute hover:bg-panel2 hover:text-fg"}`}>{Icon(n.icon)}{n.label}</Link>)}
            </aside></div>}
          <main className="relative z-10 p-4 sm:p-6">{children}</main>
          <footer className="relative z-10 px-6 pb-5 text-[11px] text-mute">Informational only — not investment advice. No trades are executed. Impact analyses are rule-based scenarios, not predictions. Data may be delayed.</footer>
        </div>
      </div>
      <SyncBanner />
      <AlertRunner />
    </PanelProvider>
  );
}
