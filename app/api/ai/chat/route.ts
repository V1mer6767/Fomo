import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/supabase/config";
import { AI_CONFIGURED, CHAT_MODEL, callClaude, type Msg } from "@/lib/ai/claude";
import { ANALYST_SYSTEM } from "@/lib/ai/prompts";
import { fallbackAnswer, retrieve } from "@/lib/ai/context";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const json = (b: object, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAILY = () => Math.max(1, Number(process.env.AI_DAILY_LIMIT) || 30);

export async function POST(req: NextRequest) {
  if (!isConfigured) return json({ error: "Accounts are not configured." }, 501);
  const origin = req.headers.get("origin"); if (origin && origin !== req.nextUrl.origin) return json({ error: "Forbidden." }, 403);
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: "Sign in to use the AI analyst." }, 401);
  const body = await req.json().catch(() => null) as { message?: string; conversationId?: string } | null;
  const message = (body?.message ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  if (!message || message.length > 2000) return json({ error: "Message must be 1–2000 characters." }, 400);
  if (body?.conversationId && !UUID.test(body.conversationId)) return json({ error: "Bad conversation id." }, 400);

  // cost control: per-user daily limit (counted from stored messages; RLS scopes to the user)
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { count } = await sb.from("ai_messages").select("id", { count: "exact", head: true }).eq("role", "user").gte("created_at", since.toISOString());
  if ((count ?? 0) >= DAILY()) return json({ error: `Daily limit of ${DAILY()} questions reached. Try again tomorrow.` }, 429);

  let convId = body?.conversationId ?? null; let history: Msg[] = [];
  if (convId) {
    const { data: c } = await sb.from("ai_conversations").select("id").eq("id", convId).maybeSingle();
    if (!c) return json({ error: "Conversation not found." }, 404);
    const { data: prev } = await sb.from("ai_messages").select("role,content").eq("conversation_id", convId).order("created_at", { ascending: false }).limit(8);
    history = (prev ?? []).reverse().map(m => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 4000) }));
  } else {
    const { data: c, error } = await sb.from("ai_conversations").insert({ user_id: user.id, title: message.slice(0, 80) }).select("id").single();
    if (error || !c) return json({ error: "Couldn't start the conversation." }, 500);
    convId = c.id;
  }

  const r = await retrieve(message);
  let answer: string; let mode: "claude" | "rules" = "rules"; let model: string | null = null; let usage;
  if (AI_CONFIGURED()) {
    try {
      const prompt = `<retrieved_data>\n${r.text}\n</retrieved_data>\n\nUser question: ${message}`;
      const out = await callClaude({ model: CHAT_MODEL(), system: ANALYST_SYSTEM, messages: [...history, { role: "user", content: prompt }], maxTokens: 1500 });
      answer = out.text.trim() || fallbackAnswer(r); mode = "claude"; model = CHAT_MODEL(); usage = out.usage;
    } catch (e: any) { console.error("[ai/chat]", e.message); answer = fallbackAnswer(r) + `\n\n_The AI model is temporarily unavailable (${String(e.message).slice(0, 80)}). Showing the rule-based summary instead._`; }
  } else answer = fallbackAnswer(r);

  const used = r.sources.filter(s => answer.includes(`[S${s.n}]`));
  const sources = used.length ? used : r.sources.slice(0, 6);
  const saved = await sb.from("ai_messages").insert([
    { conversation_id: convId, user_id: user.id, role: "user", content: message, sources: [], meta: {}, created_at: new Date(Date.now() - 1000).toISOString() },
    { conversation_id: convId, user_id: user.id, role: "assistant", content: answer.slice(0, 19000), sources, meta: { mode, model, asOf: r.asOf, demo: r.demo, usage }, created_at: new Date().toISOString() },
  ]);
  if (saved.error) console.error("[ai/chat] saving messages failed:", saved.error.message);
  await sb.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
  return json({ conversationId: convId, answer, sources, meta: { mode, model, asOf: r.asOf, demo: r.demo }, saveError: saved.error?.message ?? null });
}
