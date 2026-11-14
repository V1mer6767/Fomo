import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isConfigured } from "@/lib/supabase/config";

const PUBLIC = ["/login", "/signup", "/forgot-password", "/auth"];
const AUTH_ONLY_GUEST = ["/login", "/signup", "/forgot-password"];
const match = (p: string, list: string[]) => list.some(x => p === x || p.startsWith(x + "/"));

/** Refreshes the Supabase session cookie and protects every page: signed-out visitors are sent to /login. */
export async function middleware(req: NextRequest) {
  if (!isConfigured) return NextResponse.next(); // local mode: no accounts
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: list => { list.forEach(({ name, value }) => req.cookies.set(name, value)); res = NextResponse.next({ request: req }); list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)); },
    },
  });
  let user = null;
  try { user = (await sb.auth.getUser()).data.user; } catch { user = null; }
  const path = req.nextUrl.pathname;
  const redirect = (to: string, search?: Record<string, string>) => {
    const url = req.nextUrl.clone(); url.pathname = to; url.search = ""; Object.entries(search ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = NextResponse.redirect(url); res.cookies.getAll().forEach(c => r.cookies.set(c)); return r;
  };
  if (!user && !match(path, PUBLIC)) return redirect("/login", path !== "/" ? { next: path + req.nextUrl.search } : undefined);
  if (user && match(path, AUTH_ONLY_GUEST)) return redirect("/");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
export const config = { matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|manifest.webmanifest|logos/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"] };
