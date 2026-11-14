"use client";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { GOOGLE_ENABLED, isConfigured } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SetupNotice() {
  return (<div className="space-y-3 text-sm">
    <h1 className="text-xl font-bold">Accounts aren’t set up yet</h1>
    <p className="text-mute">Add these environment variables in Vercel (Settings → Environment Variables), then redeploy:</p>
    <pre className="overflow-x-auto rounded-xl border border-line bg-panel2/60 p-3 text-[12px]">{`NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   (server only)`}</pre>
    <p className="text-mute">Also run <code>supabase/schema.sql</code> in the Supabase SQL editor. Full steps are in the README.</p>
    <a href="/" className="btn-p inline-flex bg-gradient-to-r from-info to-pink">Continue in local mode</a>
  </div>);
}
export function Field({ label, type = "text", value, onChange, autoComplete, error, placeholder }: { label: string; type?: string; value: string; onChange: (v: string) => void; autoComplete?: string; error?: string | null; placeholder?: string }) {
  const [show, setShow] = useState(false); const pw = type === "password";
  return (<label className="block">
    <span className="mb-1.5 block text-xs font-medium text-mute">{label}</span>
    <span className="relative block">
      <input className={`inp w-full ${pw ? "pr-11" : ""} ${error ? "!border-down" : ""}`} type={pw && show ? "text" : type} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder} aria-invalid={!!error} />
      {pw && <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-fg">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
    </span>
    {error && <span className="mt-1 block text-xs text-down">{error}</span>}
  </label>);
}
export function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <button type="submit" disabled={busy} className="btn-p w-full justify-center !py-2.5 text-sm bg-gradient-to-r from-info to-pink disabled:opacity-60">{busy && <Loader2 size={15} className="animate-spin" />}{children}</button>;
}
export function Banner({ kind, children }: { kind: "error" | "ok"; children: React.ReactNode }) {
  return <div role={kind === "error" ? "alert" : "status"} className={`rounded-xl border px-3.5 py-2.5 text-sm ${kind === "error" ? "border-down/50 bg-down/10 text-down" : "border-up/50 bg-up/10 text-up"}`}>{children}</div>;
}
export function GoogleButton({ next }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  if (!GOOGLE_ENABLED || !isConfigured) return null;
  const go = async () => {
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}` } });
    if (error) setBusy(false);
  };
  return (<>
    <button type="button" onClick={go} disabled={busy} className="btn w-full justify-center !py-2.5 text-sm">
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.5 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2.1 1.4-4.7 2.3-7.7 2.3-6.3 0-11.7-4-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
      Continue with Google</button>
    <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-mute"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
  </>);
}
