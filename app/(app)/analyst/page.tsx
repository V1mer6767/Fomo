"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquarePlus, Send, Trash2 } from "lucide-react";
import Md, { SourceLink } from "@/components/Md";
import NeedAccount from "@/components/NeedAccount";
import { useAuth } from "@/components/AuthProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ago } from "@/lib/hooks";

interface Src { n: number; title: string; url: string; source: string; publishedAt: string; status?: string }
interface M { id?: string; role: "user" | "assistant"; content: string; sources?: Src[]; meta?: { mode?: string; model?: string; asOf?: string; demo?: boolean } }
const SUGGEST = ["How could this international negotiation affect Bitcoin?", "Why could a Federal Reserve rate decision influence EUR/USD?", "What are the most important developments affecting Ethereum?", "Which upcoming central-bank events matter most this week?"];

export default function Analyst() {
  const { configured, user } = useAuth();
  const [convs, setConvs] = useState<{ id: string; title: string }[]>([]); const [cid, setCid] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<M[]>([]); const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const loadConvs = useCallback(async () => { const { data } = await supabaseBrowser().from("ai_conversations").select("id,title").order("updated_at", { ascending: false }).limit(30); setConvs(data ?? []); }, []);
  useEffect(() => { if (configured && user) loadConvs(); }, [configured, user, loadConvs]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);
  if (!configured || !user) return <NeedAccount title="AI Market Analyst" />;
  const open = async (id: string) => {
    setCid(id); setErr(null);
    const { data } = await supabaseBrowser().from("ai_messages").select("id,role,content,sources,meta").eq("conversation_id", id).order("created_at"); setMsgs((data ?? []) as M[]);
  };
  const remove = async (id: string) => { await supabaseBrowser().from("ai_conversations").delete().eq("id", id); if (cid === id) { setCid(null); setMsgs([]); } loadConvs(); };
  const send = async (q?: string) => {
    const message = (q ?? text).trim(); if (!message || busy) return; setText(""); setErr(null); setBusy(true); setMsgs(m => [...m, { role: "user", content: message }]);
    try {
      const r = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, conversationId: cid }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error ?? "Request failed");
      setMsgs(m => [...m, { role: "assistant", content: j.answer, sources: j.sources, meta: j.meta }]); if (!cid) { setCid(j.conversationId); loadConvs(); }
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (<div className="grid gap-4 lg:grid-cols-[240px_1fr]">
    <aside className="card p-3 lg:max-h-[75vh] lg:overflow-y-auto"><button className="btn-p mb-2 w-full justify-center bg-gradient-to-r from-info to-pink" onClick={() => { setCid(null); setMsgs([]); setErr(null); }}><MessageSquarePlus size={14} />New chat</button>
      {convs.map(c => <div key={c.id} className={`group flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm ${cid === c.id ? "bg-info/20" : "hover:bg-panel2"}`}><button className="min-w-0 flex-1 truncate text-left" onClick={() => open(c.id)}>{c.title}</button><button aria-label="Delete" className="opacity-0 group-hover:opacity-100 text-mute hover:text-down" onClick={() => remove(c.id)}><Trash2 size={13} /></button></div>)}
      {!convs.length && <p className="px-2 py-1 text-xs text-mute">No conversations yet.</p>}</aside>
    <section className="card card-ai flex min-h-[70vh] flex-col p-4 lg:max-h-[78vh]">
      <h1 className="mb-1 text-xl font-bold tracking-tight">AI Market Analyst</h1>
      <p className="mb-3 text-xs text-mute">Searches current news, prices and the economic calendar before answering. Analysis is informational, not investment advice.</p>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {!msgs.length && <div className="grid gap-2 sm:grid-cols-2">{SUGGEST.map(s => <button key={s} onClick={() => send(s)} className="card p-3 text-left text-sm text-mute transition hover:border-info/60 hover:text-fg">{s}</button>)}</div>}
        {msgs.map((m, i) => m.role === "user" ? <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-info to-violet px-4 py-2 text-sm text-white">{m.content}</div> :
          <div key={i} className="max-w-[95%] rounded-2xl rounded-bl-md border border-line bg-panel/70 px-4 py-3">
            <Md text={m.content} cite={n => { const s = m.sources?.find(x => x.n === n); return <SourceLink n={n} url={s?.url} title={s?.title} />; }} />
            {!!m.sources?.length && <div className="mt-3 border-t border-line/70 pt-2"><div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-mute">Sources</div>
              <ul className="space-y-1 text-[11px] text-mute">{m.sources.map(s => <li key={s.n}><b className="text-info">S{s.n}</b> <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-fg hover:underline">{s.title}</a> — {s.source}, {ago(s.publishedAt)}{s.status && s.status !== "confirmed" ? <span className="text-warn"> · {s.status}</span> : null}</li>)}</ul></div>}
            <div className="mt-2 text-[10px] text-mute">{m.meta?.mode === "claude" ? `AI: ${m.meta.model}` : "Rule-based summary (AI not configured)"}{m.meta?.asOf ? ` · data as of ${new Date(m.meta.asOf).toLocaleString()}` : ""}{m.meta?.demo ? " · includes DEMO data" : ""}</div>
          </div>)}
        {busy && <div className="flex items-center gap-2 text-sm text-mute"><Loader2 size={14} className="animate-spin" />Searching news and market data, then analysing…</div>}
        <div ref={end} />
      </div>
      {err && <div role="alert" className="mt-2 rounded-xl border border-down/50 bg-down/10 px-3 py-2 text-sm text-down">{err}</div>}
      <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); send(); }}>
        <input className="inp min-w-0 flex-1" value={text} maxLength={2000} onChange={e => setText(e.target.value)} placeholder="Ask about crypto, forex, central banks, politics…" />
        <button className="btn-p bg-gradient-to-r from-info to-pink" disabled={busy || !text.trim()} aria-label="Send"><Send size={14} /></button></form>
    </section></div>);
}
