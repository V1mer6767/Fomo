"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as I from "lucide-react";
import { NAV } from "@/lib/nav";
import { useSetting } from "@/lib/storage";
import GlobalSearch from "./GlobalSearch";
import AlertRunner from "./AlertRunner";

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useSetting<boolean>("sidebar", false);
  const [theme, setTheme] = useSetting<"dark" | "light">("theme", "dark");
  const [mobile, setMobile] = useState(false);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => setMobile(false), [path]);
  const Icon = (n: string) => { const C = (I as any)[n] ?? I.Circle; return <C size={18} className="shrink-0" />; };
  return (
    <div className="min-h-screen flex">
      {mobile && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobile(false)} />}
      <aside className={`fixed lg:sticky top-0 z-40 h-screen border-r border-line bg-panel flex flex-col transition-all
        ${collapsed ? "lg:w-[64px]" : "lg:w-[236px]"} w-[236px] ${mobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="h-14 flex items-center gap-2 px-4 border-b border-line">
          {collapsed ? <I.TrendingUp size={20} className="mx-auto text-mute" /> : <div className="font-bold tracking-tight">FOMO <span className="text-mute font-medium">Intel</span></div>}
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map(n => {
            const act = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} title={n.label}
                className={`mx-2 my-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${act ? "bg-info/15 text-info" : "text-mute hover:bg-panel2 hover:text-fg"}`}>
                {Icon(n.icon)}{!collapsed && <span className="truncate">{n.label}</span>}
              </Link>);
          })}
        </nav>
        <button className="hidden lg:flex m-2 items-center gap-2 rounded-lg px-3 py-2 text-xs text-mute hover:bg-panel2"
          onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <I.PanelLeftOpen size={16} /> : <><I.PanelLeftClose size={16} /> Collapse</>}
        </button>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-14 border-b border-line bg-bg/85 backdrop-blur flex items-center gap-3 px-3 sm:px-5">
          <button className="lg:hidden btn !px-2" onClick={() => setMobile(true)} aria-label="Menu"><I.Menu size={16} /></button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2">
            <button className="btn !px-2" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              {theme === "dark" ? <I.Sun size={15} /> : <I.Moon size={15} />}
            </button>
          </div>
        </header>
        <main className="p-3 sm:p-5 max-w-[1500px] w-full mx-auto">{children}</main>
        <footer className="px-5 pb-6 text-[11px] text-mute">
          Informational only — not investment advice. No trades are executed. Impact analyses are rule-based scenarios, not predictions. Data may be delayed.
        </footer>
      </div>
      <AlertRunner />
    </div>
  );
}
