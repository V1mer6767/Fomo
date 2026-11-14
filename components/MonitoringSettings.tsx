"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";
import { ASSETS } from "@/lib/assets";
import { CATEGORIES, COUNTRY_NAMES } from "@/lib/countries";

interface P { enabled: boolean; in_app: boolean; email: boolean; briefing: boolean; min_importance: string; assets: string[]; categories: string[]; countries: string[] }
const P0: P = { enabled: true, in_app: true, email: false, briefing: true, min_importance: "high", assets: [], categories: [], countries: [] };
const Chip = ({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) => <button type="button" onClick={onClick} aria-pressed={on} className={`chip transition ${on ? "!border-info !bg-info/25 text-fg" : "hover:border-info/50"}`}>{children}</button>;
const Toggle = ({ label, hint, on, set, disabled }: { label: string; hint?: string; on: boolean; set: (v: boolean) => void; disabled?: boolean }) => (
  <label className={`flex items-center justify-between gap-3 py-1.5 ${disabled ? "opacity-50" : ""}`}><span><span className="text-sm">{label}</span>{hint && <span className="block text-[11px] text-mute">{hint}</span>}</span>
    <input type="checkbox" className="h-4 w-4 accent-[rgb(139,92,246)]" checked={on} disabled={disabled} onChange={e => set(e.target.checked)} /></label>);

export default function MonitoringSettings() {
  const { user } = useAuth(); const [p, setP] = useState<P | null>(null); const [msg, setMsg] = useState<string | null>(null); const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { if (!user) return; supabaseBrowser().from("user_monitoring_preferences").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => setP({ ...P0, ...(data ?? {}) })); }, [user]);
  if (!user || !p) return null;
  const save = (n: P) => {
    setP(n); setMsg(null); clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { error } = await supabaseBrowser().from("user_monitoring_preferences").upsert({ user_id: user.id, enabled: n.enabled, in_app: n.in_app, email: n.email, briefing: n.briefing, min_importance: n.min_importance, assets: n.assets, categories: n.categories, countries: n.countries, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      setMsg(error ? `Couldn't save: ${error.message}` : "Saved");
    }, 500);
  };
  const tog = (k: "assets" | "categories" | "countries", v: string) => save({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] });
  return (<section id="monitoring" className="card p-4 text-sm space-y-3">
    <div className="flex items-center"><div className="font-semibold">News monitoring & notifications</div><span className="ml-auto text-[11px] text-mute">{msg}</span></div>
    <div className="divide-y divide-line/60"><Toggle label="Notifications" hint="Master switch — turn everything off here" on={p.enabled} set={v => save({ ...p, enabled: v })} />
      <Toggle label="In-app notifications" on={p.in_app} set={v => save({ ...p, in_app: v })} disabled={!p.enabled} />
      <Toggle label="Daily briefing" hint="Saved to your account each day" on={p.briefing} set={v => save({ ...p, briefing: v })} disabled={!p.enabled} />
      <Toggle label="Email notifications" hint="Not available yet" on={false} set={() => {}} disabled /></div>
    <label className="block text-xs text-mute">Minimum importance<select className="inp mt-1 w-full" value={p.min_importance} onChange={e => save({ ...p, min_importance: e.target.value })}><option value="critical">Critical only</option><option value="high">High and above</option><option value="medium">Medium and above</option><option value="low">Everything</option></select></label>
    <div><div className="mb-1.5 text-xs text-mute">Assets I follow <span className="opacity-70">(none selected = all)</span></div><div className="flex flex-wrap gap-1.5">{ASSETS.map(a => <Chip key={a.id} on={p.assets.includes(a.id)} onClick={() => tog("assets", a.id)}>{a.symbol}</Chip>)}</div></div>
    <div><div className="mb-1.5 text-xs text-mute">Categories <span className="opacity-70">(none = all)</span></div><div className="flex flex-wrap gap-1.5">{CATEGORIES.filter(c => c !== "other").map(c => <Chip key={c} on={p.categories.includes(c)} onClick={() => tog("categories", c)}>{c}</Chip>)}</div></div>
    <div><div className="mb-1.5 text-xs text-mute">Countries <span className="opacity-70">(none = all)</span></div><div className="flex flex-wrap gap-1.5">{Object.entries(COUNTRY_NAMES).map(([c, n]) => <Chip key={c} on={p.countries.includes(c)} onClick={() => tog("countries", c)}>{n}</Chip>)}</div></div>
  </section>);
}
