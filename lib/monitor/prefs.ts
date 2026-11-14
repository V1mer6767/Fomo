import type { Importance } from "../types";
import { levelRank } from "./importance";

export interface MonitorPrefs { enabled: boolean; in_app: boolean; min_importance: Importance; assets: string[]; categories: string[]; countries: string[] }
export interface NotifiableEvent { level: Importance; category: string; country: string | null; assets: string[] }
/** Does this event qualify for this user's notification settings? Empty lists mean "no restriction". */
export function matchesPrefs(p: MonitorPrefs, ev: NotifiableEvent): boolean {
  if (!p.enabled || !p.in_app) return false;
  if (levelRank(ev.level) < levelRank(p.min_importance)) return false;
  if (p.categories.length && !p.categories.includes(ev.category)) return false;
  if (p.countries.length && (!ev.country || !p.countries.includes(ev.country))) return false;
  if (p.assets.length && !ev.assets.some(a => p.assets.includes(a))) return false;
  return true;
}
