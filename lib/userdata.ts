"use client";
import { useSetting } from "./storage";
export const useWatchlist = () => {
  const [list, set] = useSetting<string[]>("watchlist", ["BTC", "ETH", "EURUSD", "XAU", "SPX"]);
  return { list, has: (id: string) => list.includes(id), toggle: (id: string) => set(list.includes(id) ? list.filter(x => x !== id) : [...list, id]),
    move: (id: string, d: -1 | 1) => { const i = list.indexOf(id), j = i + d; if (i < 0 || j < 0 || j >= list.length) return; const n = [...list]; [n[i], n[j]] = [n[j], n[i]]; set(n); } };
};
export interface AlertRule { id: string; kind: "price-above" | "price-below" | "move-24h" | "news-keyword" | "high-importance"; asset?: string; value?: number; keyword?: string; enabled: boolean; fired?: boolean }
export interface AlertLog { id: string; at: string; text: string; link?: string }
export const useAlertRules = () => useSetting<AlertRule[]>("alertRules", []);
export const useAlertLog = () => useSetting<AlertLog[]>("alertLog", []);
export interface Position { asset: string; qty: number; avg: number }
export interface Trade { at: string; asset: string; side: "buy" | "sell"; qty: number; price: number }
export interface Portfolio { cash: number; positions: Position[]; trades: Trade[]; equity: { t: number; v: number }[]; start: number }
export const PORTFOLIO0: Portfolio = { cash: 100000, positions: [], trades: [], equity: [], start: 100000 };
export const usePortfolio = () => useSetting<Portfolio>("portfolio", PORTFOLIO0);
