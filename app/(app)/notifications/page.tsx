"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Settings as Cog } from "lucide-react";
import NeedAccount from "@/components/NeedAccount";
import { useAuth } from "@/components/AuthProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ago } from "@/lib/hooks";
import { LevelBadge } from "@/components/LevelBadge";

export default function Notifications() {
  const { configured, user } = useAuth(); const [rows, setRows] = useState<any[] | null>(null);
  const load = useCallback(async () => { const { data } = await supabaseBrowser().from("user_notifications").select("id,event_id,title,body,importance,created_at,read_at").order("created_at", { ascending: false }).limit(100); setRows(data ?? []); }, []);
  useEffect(() => { if (configured && user) load(); }, [configured, user, load]);
  if (!configured || !user) return <NeedAccount title="Notifications" />;
  const markAll = async () => { await supabaseBrowser().from("user_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null); window.dispatchEvent(new Event("notif-refresh")); load(); };
  const clear = async () => { await supabaseBrowser().from("user_notifications").delete().not("id", "is", null); window.dispatchEvent(new Event("notif-refresh")); load(); };
  return (<div className="max-w-3xl space-y-4"><div className="flex flex-wrap items-center gap-2"><h1 className="mr-auto text-2xl font-bold tracking-tight">Notifications</h1>
    <button className="btn" onClick={markAll}><Check size={13} />Mark all read</button><button className="btn" onClick={clear}>Clear</button><Link href="/settings#monitoring" className="btn"><Cog size={13} />Preferences</Link></div>
    {!rows ? null : !rows.length ? <div className="card p-5 text-sm text-mute">No notifications yet. Choose what you follow in <Link href="/settings#monitoring" className="text-info">Settings → News monitoring</Link>.</div> :
      <div className="space-y-2">{rows.map(n => <Link key={n.id} href={`/monitor/${n.event_id}`} onClick={() => setTimeout(() => window.dispatchEvent(new Event("notif-refresh")), 600)} className={`card lift block p-4 ${n.read_at ? "opacity-70" : "border-info/50"}`}>
        <div className="mb-1 flex items-center gap-2"><LevelBadge v={n.importance} />{!n.read_at && <span className="h-2 w-2 rounded-full bg-pink" />}<span className="ml-auto text-[11px] text-mute">{ago(n.created_at)}</span></div>
        <div className="font-semibold leading-snug">{n.title}</div>{n.body && <div className="mt-0.5 text-[11px] text-mute">{n.body}</div>}</Link>)}</div>}
  </div>);
}
