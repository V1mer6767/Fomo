export async function getText(url: string, timeoutMs = 8000, headers: Record<string, string> = {}): Promise<string> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { "User-Agent": "FOMO-Intel/0.1 (+dashboard)", ...headers }, cache: "no-store" });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return await r.text();
  } finally { clearTimeout(t); }
}
export async function getJson<T = any>(url: string, timeoutMs = 8000, headers: Record<string, string> = {}): Promise<T> {
  return JSON.parse(await getText(url, timeoutMs, { Accept: "application/json", ...headers }));
}
