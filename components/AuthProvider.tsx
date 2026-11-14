"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isConfigured } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/client";
import { clearLocalData, createCloudStore, localStore, setStore, type CloudStore } from "@/lib/storage";
import { createAdapter } from "@/lib/cloud";
import { validateAvatarDataUrl, validateDisplayName, cleanDisplayName } from "@/lib/validate";

export interface Profile { display_name: string; avatar_url: string | null; created_at: string }
interface Ctx {
  configured: boolean; user: User | null; profile: Profile | null; ready: boolean; syncError: string | null;
  signOut(): Promise<void>; updateProfile(p: { display_name?: string; avatar_url?: string | null }): Promise<string | null>;
}
const C = createContext<Ctx>({ configured: false, user: null, profile: null, ready: true, syncError: null, signOut: async () => {}, updateProfile: async () => null });
export const useAuth = () => useContext(C);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(!isConfigured);
  const [syncError, setSyncError] = useState<string | null>(null);
  const cloud = useRef<CloudStore | null>(null); const activeUid = useRef<string | null>(null);

  const teardown = useCallback(() => { cloud.current?.dispose(); cloud.current = null; activeUid.current = null; setStore(localStore); }, []);

  const attach = useCallback(async (u: User) => {
    if (activeUid.current === u.id) return;
    teardown(); activeUid.current = u.id;
    const sb = supabaseBrowser();
    const store = createCloudStore(createAdapter(sb, u.id), e => setSyncError(e ? `Sync failed: ${e.message}` : null));
    cloud.current = store;
    const [p] = await Promise.all([
      sb.from("profiles").select("display_name,avatar_url,created_at").eq("id", u.id).maybeSingle(),
      store.hydrate(),
    ]);
    if (activeUid.current !== u.id) return;
    setProfile(p.data ?? { display_name: (u.user_metadata?.full_name as string) || u.email?.split("@")[0] || "", avatar_url: null, created_at: u.created_at });
    setStore(store); setReady(true);
  }, [teardown]);

  useEffect(() => {
    if (!isConfigured) return;
    const sb = supabaseBrowser();
    sb.auth.getUser().then(({ data }) => { if (data.user) { setUser(data.user); attach(data.user); } else { setUser(null); setReady(true); } });
    const { data: sub } = sb.auth.onAuthStateChange((ev, session) => {
      if (ev === "SIGNED_OUT") { setUser(null); setProfile(null); teardown(); clearLocalData(); setReady(true); return; }
      if (session?.user) { setUser(session.user); if (ev === "SIGNED_IN" || ev === "INITIAL_SESSION") setTimeout(() => attach(session.user), 0); }
    });
    return () => sub.subscription.unsubscribe();
  }, [attach, teardown]);

  // Pull changes made on other devices when this tab regains focus (plus every 20s while the tab is visible).
  useEffect(() => {
    if (!isConfigured) return; let last = Date.now();
    const pull = () => { if (document.visibilityState !== "visible" || Date.now() - last < 10_000) return; last = Date.now(); void cloud.current?.hydrate(); };
    const tick = setInterval(() => { if (document.visibilityState === "visible") { last = Date.now(); void cloud.current?.hydrate(); } }, 20_000);
    document.addEventListener("visibilitychange", pull); window.addEventListener("focus", pull); window.addEventListener("pageshow", pull); window.addEventListener("online", pull);
    return () => { clearInterval(tick); document.removeEventListener("visibilitychange", pull); window.removeEventListener("focus", pull); window.removeEventListener("pageshow", pull); window.removeEventListener("online", pull); };
  }, []);

  const signOut = useCallback(async () => {
    try { await cloud.current?.flush(); } catch {}
    if (isConfigured) await supabaseBrowser().auth.signOut();
    teardown(); clearLocalData(); setUser(null); setProfile(null);
    router.replace("/login"); router.refresh();
  }, [router, teardown]);

  const updateProfile: Ctx["updateProfile"] = useCallback(async p => {
    if (!user) return "Not signed in.";
    const patch: Record<string, unknown> = {};
    if (p.display_name !== undefined) { const e = validateDisplayName(p.display_name); if (e) return e; patch.display_name = cleanDisplayName(p.display_name); }
    if (p.avatar_url !== undefined) { if (p.avatar_url) { const e = validateAvatarDataUrl(p.avatar_url); if (e) return e; } patch.avatar_url = p.avatar_url; }
    const { error } = await supabaseBrowser().from("profiles").update(patch).eq("id", user.id);
    if (error) return error.message;
    setProfile(pr => ({ ...(pr ?? { display_name: "", avatar_url: null, created_at: user.created_at }), ...patch } as Profile));
    return null;
  }, [user]);

  return <C.Provider value={{ configured: isConfigured, user, profile, ready, syncError, signOut, updateProfile }}>{children}</C.Provider>;
}

/** Blocks the app UI until the session and the user's cloud data are loaded, so pages never flash empty/other data. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { configured, user, ready } = useAuth(); const router = useRouter();
  useEffect(() => { if (configured && ready && !user) router.replace("/login"); }, [configured, ready, user, router]);
  if (configured && (!ready || !user)) return <div className="grid min-h-[60vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-info" aria-label="Loading" /></div>;
  return <>{children}</>;
}
