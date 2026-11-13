export type AssetClass = "crypto" | "forex" | "commodity" | "index" | "rates";
export interface AssetDef { id: string; symbol: string; name: string; cls: AssetClass; cg?: string; stooq?: string; yahoo?: string; pair?: [string, string]; aliases: string[] }
export interface Quote {
  id: string; symbol: string; name: string; cls: AssetClass; price: number | null;
  change24h: number | null; change7d: number | null; volume?: number | null; marketCap?: number | null;
  spark?: number[]; source: string; asOf: string; delayed?: boolean; demo?: boolean;
}
export type Importance = "low" | "medium" | "high" | "critical";
export type Status = "confirmed" | "developing" | "unverified";
export type Category = "politics" | "elections" | "wars" | "central-banks" | "crypto" | "stocks" | "trade" | "regulation" | "economy" | "energy" | "technology" | "other";
export interface Article {
  id: string; title: string; summary: string; source: string; url: string; publishedAt: string;
  country: string | null; category: Category; importance: Importance; assets: string[];
  status: Status; eventId: string; impactScore: number; demo?: boolean;
}
export interface EventGroup { id: string; title: string; articles: Article[]; sources: string[]; status: Status; importance: Importance; category: Category; country: string | null; assets: string[]; latest: string; impactScore: number }
export type Direction = "positive" | "negative" | "mixed" | "uncertain";
export interface AssetImpact {
  asset: string; direction: Direction; directness: "direct" | "indirect"; mechanism: string;
  alternative: string; factors: string[]; monitor: string[];
}
export interface Analysis {
  eventId: string; impacts: AssetImpact[]; scenarios: { name: string; description: string; assets: string }[];
  sections: { what: string; why: string; assets: string; scenarios: string; reaction: string; watch: string[]; confidence: { level: "low" | "medium" | "high"; note: string } };
}
export interface CalEvent {
  id: string; date: string; title: string; country: string; kind: "central-bank" | "economic" | "political"; impact: "low" | "medium" | "high";
  status: "scheduled" | "released" | "tentative"; source: string; sourceUrl: string; forecast?: string; previous?: string; actual?: string; note?: string; assets?: string[];
}
export interface ApiEnvelope<T> { data: T; source: string; fetchedAt: string; stale?: boolean; demo?: boolean; errors?: string[] }
