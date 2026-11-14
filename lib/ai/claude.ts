import "server-only";

export const AI_CONFIGURED = () => !!process.env.ANTHROPIC_API_KEY;
export const CHAT_MODEL = () => process.env.ANTHROPIC_CHAT_MODEL || "claude-sonnet-5-5";
export const FAST_MODEL = () => process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-4-5-20251001";
export interface Msg { role: "user" | "assistant"; content: string }

/** Minimal Anthropic Messages API client with timeout + retry on 429/5xx. The key stays on the server. */
export async function callClaude(o: { model: string; system: string; messages: Msg[]; maxTokens?: number; temperature?: number }): Promise<{ text: string; usage?: { input: number; output: number } }> {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 50_000);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: ctl.signal,
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: o.model, max_tokens: o.maxTokens ?? 1500, temperature: o.temperature ?? 0.3, system: o.system, messages: o.messages }),
      });
      if (r.ok) { const j = await r.json(); return { text: (j.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join(""), usage: j.usage ? { input: j.usage.input_tokens, output: j.usage.output_tokens } : undefined }; }
      lastErr = `Claude API ${r.status}`;
      if (r.status !== 429 && r.status < 500) { const b = await r.text().catch(() => ""); throw new Error(`${lastErr}: ${b.slice(0, 200)}`); }
    } catch (e: any) { lastErr = e.name === "AbortError" ? "Claude API timeout" : e.message; if (/Claude API 4/.test(lastErr)) throw e; }
    finally { clearTimeout(t); }
    await new Promise(res => setTimeout(res, 800 * (attempt + 1)));
  }
  throw new Error(lastErr || "Claude API failed");
}
