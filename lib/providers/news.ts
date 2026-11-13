import { XMLParser } from "fast-xml-parser";
import { cached } from "../cache";
import { getJson, getText } from "../http";

export interface RawItem { title: string; summary: string; source: string; url: string; publishedAt: string; official?: boolean }

export const FEEDS: { name: string; url: string; official?: boolean }[] = [
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "The Guardian", url: "https://www.theguardian.com/world/rss" },
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Federal Reserve", url: "https://www.federalreserve.gov/feeds/press_all.xml", official: true },
  { name: "ECB", url: "https://www.ecb.europa.eu/rss/press.xml", official: true },
];

const strip = (s: unknown) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const txt = (v: any) => (typeof v === "object" && v ? v["#text"] ?? v["@_href"] ?? "" : v);

export function parseFeed(xml: string, source: string, official = false): RawItem[] {
  const p = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const j = p.parse(xml);
  const items: any[] = j?.rss?.channel?.item ?? j?.feed?.entry ?? j?.["rdf:RDF"]?.item ?? [];
  return (Array.isArray(items) ? items : [items]).map(it => {
    const link = typeof it.link === "object" && !Array.isArray(it.link) ? it.link["@_href"] : Array.isArray(it.link) ? it.link[0]?.["@_href"] ?? it.link[0] : it.link;
    const d = it.pubDate ?? it.published ?? it.updated ?? it["dc:date"];
    const t = d ? new Date(txt(d)) : new Date();
    return { title: strip(txt(it.title)), summary: strip(txt(it.description ?? it.summary ?? it["content:encoded"] ?? "")).slice(0, 320),
      source, url: String(link ?? ""), publishedAt: (isNaN(+t) ? new Date() : t).toISOString(), official };
  }).filter(i => i.title && i.url);
}

export async function fetchRss(): Promise<{ items: RawItem[]; errors: string[] }> {
  const errors: string[] = [];
  const res = await Promise.all(FEEDS.map(async f => {
    try { return (await cached("rss:" + f.name, 5 * 60_000, async () => parseFeed(await getText(f.url, 8000), f.name, f.official))).value.slice(0, 25); }
    catch (e: any) { errors.push(`${f.name}: ${e.message}`); return [] as RawItem[]; }
  }));
  return { items: res.flat(), errors };
}

/** GDELT DOC 2.0 — global coverage, no key. Rate limited (~1 req / 5 s) so cached for 10 min. */
export async function fetchGdelt(): Promise<RawItem[]> {
  const q = encodeURIComponent("(economy OR election OR sanctions OR \"central bank\" OR tariff OR war OR crypto) sourcelang:english");
  const j = await getJson<any>(`https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=40&format=json&sort=datedesc&timespan=6h`, 9000);
  return (j.articles ?? []).map((a: any) => {
    const s = String(a.seendate ?? ""); // 20260101T120000Z
    const t = /^\d{8}T\d{6}Z$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z` : new Date().toISOString();
    return { title: strip(a.title), summary: "", source: a.domain ?? "GDELT", url: a.url, publishedAt: t } as RawItem;
  }).filter((i: RawItem) => i.title && i.url);
}

/** Optional NewsAPI (needs NEWSAPI_KEY, server-side only). */
export async function fetchNewsApi(): Promise<RawItem[]> {
  const key = process.env.NEWSAPI_KEY; if (!key) return [];
  const j = await getJson<any>(`https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=40&apiKey=${key}`);
  return (j.articles ?? []).map((a: any) => ({ title: strip(a.title), summary: strip(a.description), source: a.source?.name ?? "NewsAPI", url: a.url, publishedAt: a.publishedAt })).filter((i: RawItem) => i.title && i.url);
}

export async function fetchAllNews(): Promise<{ items: RawItem[]; errors: string[] }> {
  const rss = await fetchRss();
  const errors = [...rss.errors];
  const extra = await Promise.all([
    cached("gdelt", 10 * 60_000, fetchGdelt).then(r => r.value).catch(e => { errors.push("GDELT: " + e.message); return [] as RawItem[]; }),
    cached("newsapi", 10 * 60_000, fetchNewsApi).then(r => r.value).catch(e => { errors.push("NewsAPI: " + e.message); return [] as RawItem[]; }),
  ]);
  return { items: [...rss.items, ...extra.flat()], errors };
}
