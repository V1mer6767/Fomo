/** Supabase is optional. Without these two public variables the app runs in local (browser-storage) mode. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const isConfigured = /^https?:\/\//.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;
export const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";
