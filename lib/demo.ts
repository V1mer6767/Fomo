import type { Quote } from "./types";
/** ILLUSTRATIVE placeholder values, used ONLY when every live provider fails. Always shown with a DEMO banner; never real market data. */
const D: [string, number, number, number][] = [
  ["BTC", 65000, 0.8, 3.1], ["ETH", 3200, -0.4, 2.2], ["SOL", 150, 1.2, -1.5], ["XRP", 0.55, 0.3, 0.9], ["BNB", 590, 0.1, 1.0], ["ADA", 0.45, -0.7, -2.0], ["DOGE", 0.15, 1.5, 4.0],
  ["EURUSD", 1.08, 0.1, 0.3], ["GBPUSD", 1.27, -0.1, 0.2], ["USDJPY", 150, 0.2, 0.5], ["USDCHF", 0.9, 0, -0.2], ["AUDUSD", 0.66, 0.1, 0.4], ["USDCAD", 1.36, -0.1, -0.1], ["NZDUSD", 0.6, 0, 0.1],
  ["XAU", 2300, 0.3, 1.2], ["WTI", 80, -0.5, -1.0], ["SPX", 5200, 0.2, 0.8], ["NDX", 18000, 0.3, 1.1], ["DJI", 39000, 0.1, 0.5], ["DAX", 18000, 0.2, 0.6],
];
import { asset } from "./assets";
export function demoQuotes(): Quote[] {
  return D.map(([id, price, c24, c7]) => { const a = asset(id)!; return { id, symbol: a.symbol, name: a.name, cls: a.cls, price, change24h: c24, change7d: c7, source: "DEMO", asOf: new Date().toISOString(), demo: true } as Quote; });
}
