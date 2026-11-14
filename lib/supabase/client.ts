"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isConfigured } from "./config";

let client: SupabaseClient | null = null;
/** Browser client — uses only the public anon key; every table is protected by Row Level Security. */
export function supabaseBrowser(): SupabaseClient {
  if (!isConfigured) throw new Error("Supabase is not configured");
  return (client ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY) as unknown as SupabaseClient);
}
