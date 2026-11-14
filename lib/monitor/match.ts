import { jaccard, tokens } from "../analysis/engine";

/** Re-identify an event across cron runs (clusters change slightly each time) so we never create/alert the same event twice. */
export function matchExisting(title: string, existing: { id: string; title: string }[], threshold = 0.5): string | null {
  const t = new Set(tokens(title)); let best: string | null = null; let bestScore = 0;
  for (const e of existing) { const s = jaccard(t, new Set(tokens(e.title))); if (s > bestScore) { bestScore = s; best = e.id; } }
  return bestScore >= threshold ? best : null;
}
