import type { AssetDef } from "./types";
export const ASSETS: AssetDef[] = [
  { id: "BTC", yahoo: "BTC-USD", symbol: "BTC", name: "Bitcoin", cls: "crypto", cg: "bitcoin", aliases: ["bitcoin", "btc"] },
  { id: "ETH", yahoo: "ETH-USD", symbol: "ETH", name: "Ethereum", cls: "crypto", cg: "ethereum", aliases: ["ethereum", "ether", "eth"] },
  { id: "SOL", yahoo: "SOL-USD", symbol: "SOL", name: "Solana", cls: "crypto", cg: "solana", aliases: ["solana"] },
  { id: "XRP", yahoo: "XRP-USD", symbol: "XRP", name: "XRP", cls: "crypto", cg: "ripple", aliases: ["xrp", "ripple"] },
  { id: "BNB", yahoo: "BNB-USD", symbol: "BNB", name: "BNB", cls: "crypto", cg: "binancecoin", aliases: ["bnb", "binance coin"] },
  { id: "ADA", yahoo: "ADA-USD", symbol: "ADA", name: "Cardano", cls: "crypto", cg: "cardano", aliases: ["cardano"] },
  { id: "DOGE", yahoo: "DOGE-USD", symbol: "DOGE", name: "Dogecoin", cls: "crypto", cg: "dogecoin", aliases: ["dogecoin"] },
  { id: "EURUSD", yahoo: "EURUSD=X", symbol: "EUR/USD", name: "Euro / US Dollar", cls: "forex", pair: ["EUR", "USD"], aliases: ["euro", "eur"] },
  { id: "GBPUSD", yahoo: "GBPUSD=X", symbol: "GBP/USD", name: "Pound / US Dollar", cls: "forex", pair: ["GBP", "USD"], aliases: ["pound", "sterling", "gbp"] },
  { id: "USDJPY", yahoo: "USDJPY=X", symbol: "USD/JPY", name: "US Dollar / Yen", cls: "forex", pair: ["USD", "JPY"], aliases: ["yen", "jpy"] },
  { id: "USDCHF", yahoo: "USDCHF=X", symbol: "USD/CHF", name: "US Dollar / Franc", cls: "forex", pair: ["USD", "CHF"], aliases: ["franc", "chf"] },
  { id: "AUDUSD", yahoo: "AUDUSD=X", symbol: "AUD/USD", name: "Aussie / US Dollar", cls: "forex", pair: ["AUD", "USD"], aliases: ["aussie", "aud"] },
  { id: "USDCAD", yahoo: "USDCAD=X", symbol: "USD/CAD", name: "US Dollar / CAD", cls: "forex", pair: ["USD", "CAD"], aliases: ["cad", "loonie"] },
  { id: "NZDUSD", yahoo: "NZDUSD=X", symbol: "NZD/USD", name: "Kiwi / US Dollar", cls: "forex", pair: ["NZD", "USD"], aliases: ["nzd", "kiwi"] },
  { id: "XAU", symbol: "XAU/USD", name: "Gold", cls: "commodity", stooq: "xauusd", yahoo: "GC=F", aliases: ["gold", "bullion"] },
  { id: "WTI", symbol: "WTI", name: "Crude Oil (WTI)", cls: "commodity", stooq: "cl.f", yahoo: "CL=F", aliases: ["oil", "crude", "wti", "brent", "opec"] },
  { id: "SPX", symbol: "S&P 500", name: "S&P 500", cls: "index", stooq: "^spx", yahoo: "^GSPC", aliases: ["s&p", "s&p 500", "wall street", "stocks"] },
  { id: "NDX", symbol: "NASDAQ 100", name: "Nasdaq 100", cls: "index", stooq: "^ndx", yahoo: "^NDX", aliases: ["nasdaq", "tech stocks"] },
  { id: "DJI", symbol: "DOW", name: "Dow Jones", cls: "index", stooq: "^dji", yahoo: "^DJI", aliases: ["dow"] },
  { id: "DAX", symbol: "DAX", name: "DAX 40", cls: "index", stooq: "^dax", yahoo: "^GDAXI", aliases: ["dax"] },
  { id: "DXY", symbol: "USD", name: "US Dollar (broad)", cls: "forex", aliases: ["dollar", "usd", "greenback"] },
];
export const asset = (id: string) => ASSETS.find(a => a.id === id);
export const ASSET_IDS = ASSETS.map(a => a.id);
