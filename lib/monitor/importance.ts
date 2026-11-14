import type { Category, EventGroup, Importance } from "../types";

export const LEVELS: Importance[] = ["low", "medium", "high", "critical"];
export const levelRank = (l: Importance) => LEVELS.indexOf(l);
const MAJOR_GEO = new Set(["US", "EU", "CN", "JP", "UK", "DE", "RU"]);
const SIGNIFICANT: Partial<Record<Category, number>> = { "central-banks": 2, wars: 2, elections: 2, regulation: 1, trade: 1, crypto: 1, economy: 1, energy: 1 };

/**
 * Importance of an EVENT (not predicted price volatility): source reliability, significance, breadth of affected assets,
 * geography, confirmation and freshness. Pure function, no price data involved.
 */
export function monitorLevel(ev: Pick<EventGroup, "category" | "country" | "sources" | "assets" | "status" | "latest" | "impactScore">, official = false, now = Date.now()): { level: Importance; score: number } {
  let s = 0;
  s += official ? 3 : ev.sources.length >= 3 ? 2 : ev.sources.length === 2 ? 1 : 0;           // source reliability
  s += SIGNIFICANT[ev.category] ?? 0;                                                          // event significance
  s += ev.assets.length >= 4 ? 2 : ev.assets.length >= 2 ? 1 : 0;                              // number of affected assets
  s += ev.country && MAJOR_GEO.has(ev.country) ? 1 : 0;                                        // geographic importance
  s += ev.impactScore >= 65 ? 2 : ev.impactScore >= 35 ? 1 : 0;                                // economic importance (rule engine)
  s += ev.status === "confirmed" ? 2 : ev.status === "unverified" ? -1 : 0;                    // confirmed?
  const ageH = (now - +new Date(ev.latest)) / 36e5;
  s += ageH <= 3 ? 1 : ageH > 36 ? -1 : 0;                                                     // new vs already known
  const level: Importance = s >= 10 ? "critical" : s >= 7 ? "high" : s >= 4 ? "medium" : "low";
  return { level, score: s };
}
