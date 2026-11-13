import type { Analysis, Article, AssetImpact, Category, Direction, EventGroup, Importance, Status } from "../types";
import type { RawItem } from "../providers/news";
import { RULES } from "./rules";

/* ---------- text utils ---------- */
const STOP = new Set("a an the of to in on for and or as at by with from after before over under into is are was were be been it its this that these those says say said new news live update updates amid about than more less up down us who what why how will may could would not no".split(" "));
export const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s$%.-]/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
export const jaccard = (a: Set<string>, b: Set<string>) => { let i = 0; a.forEach(x => b.has(x) && i++); const u = a.size + b.size - i; return u ? i / u : 0; };
const normUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

/* ---------- country / category ---------- */
const COUNTRIES: [string, RegExp][] = [
  ["US", /\b(u\.?s\.?a?\.?|united states|america(n)?|washington|white house|congress|federal reserve|fed|fomc|trump|biden|wall street|pentagon|senate)\b/i],
  ["UK", /\b(uk|britain|british|england|london|bank of england|downing street|starmer)\b/i],
  ["EU", /\b(eu|european union|eurozone|euro area|brussels|ecb|lagarde)\b/i],
  ["DE", /\b(germany|german|berlin|bundesbank|dax)\b/i], ["FR", /\b(france|french|paris|macron)\b/i],
  ["JP", /\b(japan|japanese|tokyo|boj|bank of japan|yen)\b/i], ["CN", /\b(china|chinese|beijing|pboc|xi jinping|hong kong)\b/i],
  ["RU", /\b(russia|russian|moscow|kremlin|putin)\b/i], ["UA", /\b(ukraine|ukrainian|kyiv|kiev|zelensky\w*)\b/i],
  ["IL", /\b(israel|israeli|tel aviv|netanyahu|idf)\b/i], ["PS", /\b(gaza|palestin\w+|hamas|west bank)\b/i], ["IR", /\b(iran|iranian|tehran)\b/i],
  ["IN", /\b(india|indian|delhi|modi|rbi)\b/i], ["CA", /\b(canada|canadian|ottawa|bank of canada)\b/i], ["AU", /\b(australia|australian|rba|sydney)\b/i],
  ["CH", /\b(switzerland|swiss|snb)\b/i], ["SA", /\b(saudi|riyadh|opec)\b/i], ["TR", /\b(turkey|turkish|ankara|erdogan)\b/i], ["BR", /\b(brazil|brazilian|brasilia|lula)\b/i],
  ["MX", /\b(mexico|mexican)\b/i], ["KR", /\b(south korea|korean|seoul)\b/i], ["TW", /\b(taiwan|taipei|tsmc)\b/i],
];
export function detectCountry(text: string): string | null {
  let best: [string, number] | null = null;
  for (const [c, re] of COUNTRIES) { const m = text.match(new RegExp(re.source, "gi")); if (m && (!best || m.length > best[1])) best = [c, m.length]; }
  return best ? best[0] : null;
}
const CATS: [Category, RegExp][] = [
  ["central-banks", /\b(fed|fomc|ecb|boe|boj|snb|rba|central bank|rate (hike|cut|decision)|interest rates?|powell|lagarde|monetary policy)\b/i],
  ["wars", /\b(war|missile|invasion|ceasefire|cease-fire|airstrike|air strike|troops|military|shelling|drone attack|hostilit\w+|conflict)\b/i],
  ["elections", /\b(election|elections|vote|ballot|referendum|polls?|candidate|campaign)\b/i],
  ["crypto", /\b(bitcoin|btc|ethereum|crypto\w*|stablecoin|altcoin|blockchain|solana|xrp|binance|coinbase)\b/i],
  ["regulation", /\b(regulat\w+|sec |lawsuit|antitrust|ban|legislation|bill passes|compliance|fine[sd]?)\b/i],
  ["trade", /\b(tariffs?|trade (war|deal|talks)|export controls?|sanctions?|embargo)\b/i],
  ["energy", /\b(oil|opec|crude|gas prices?|lng|energy)\b/i],
  ["stocks", /\b(stocks?|shares|earnings|nasdaq|s&p|dow|equities|wall street|ipo)\b/i],
  ["economy", /\b(inflation|cpi|gdp|jobs|unemployment|recession|economy|economic|growth|payrolls?|pmi)\b/i],
  ["politics", /\b(president|prime minister|government|minister|parliament|congress|senate|policy|diplomat\w*|summit|treaty|protest)\b/i],
  ["technology", /\b(ai|artificial intelligence|chip|semiconductor|tech)\b/i],
];
export function classify(text: string): Category { for (const [c, re] of CATS) if (re.test(text)) return c; return "other"; }

/* ---------- importance / status ---------- */
const CRIT = /\b(emergency|crash|collapse|default|invasion|rate (hike|cut)|surprise|plunge|soar|record|war|attack|default|bankrupt\w*|halts?|sanction\w*)\b/i;
export function scoreImportance(text: string, cat: Category, official: boolean, nSources: number, nAssets: number): Importance {
  let s = 0;
  if (["central-banks", "wars"].includes(cat)) s += 2; else if (["elections", "trade", "regulation", "economy", "energy", "crypto"].includes(cat)) s += 1;
  if (CRIT.test(text)) s += 1;
  if (official) s += 1;
  if (nSources >= 3) s += 1;
  if (nAssets >= 4) s += 1;
  return s >= 5 ? "critical" : s >= 3 ? "high" : s >= 2 ? "medium" : "low";
}
const HEDGE = /\b(reportedly|rumou?rs?|unconfirmed|allegedly|sources say|according to sources|claims?|speculat\w+|could be|may have|unverified)\b/i;
export function eventStatus(text: string, nDistinctSources: number, official: boolean): Status {
  if (official || nDistinctSources >= 2) return HEDGE.test(text) && !official && nDistinctSources < 3 ? "developing" : "confirmed";
  return HEDGE.test(text) ? "unverified" : "developing";
}

/* ---------- impacts ---------- */
const mergeDir = (a: Direction, b: Direction): Direction => a === b ? a : (a === "uncertain" ? b : b === "uncertain" ? a : "mixed");
export function assetsFor(text: string): AssetImpact[] {
  const map = new Map<string, AssetImpact>();
  for (const r of RULES) {
    if (!r.test.test(text)) continue;
    for (const t of r.tpl(text)) {
      const ex = map.get(t.asset);
      if (!ex) map.set(t.asset, { asset: t.asset, direction: t.dir, directness: t.direct ? "direct" : "indirect", mechanism: t.mech, alternative: t.alt, factors: [...t.factors], monitor: [...t.monitor] });
      else if (!ex.mechanism.includes(t.mech)) {
        ex.direction = mergeDir(ex.direction, t.dir); if (t.direct) ex.directness = "direct";
        ex.mechanism += " Also: " + t.mech; ex.alternative += " " + t.alt;
        ex.factors = [...new Set([...ex.factors, ...t.factors])]; ex.monitor = [...new Set([...ex.monitor, ...t.monitor])];
      }
    }
  }
  return [...map.values()].sort((a, b) => (a.directness === b.directness ? 0 : a.directness === "direct" ? -1 : 1)).slice(0, 8);
}

/* ---------- pipeline: raw -> articles -> event groups ---------- */
export function buildArticles(raw: RawItem[]): Article[] {
  const seen = new Set<string>(); const out: Article[] = [];
  for (const r of raw) {
    const key = normUrl(r.url); if (seen.has(key)) continue; seen.add(key);
    const text = `${r.title}. ${r.summary}`;
    const cat = classify(text);
    const impacts = assetsFor(text);
    out.push({ id: hash(key), title: r.title, summary: r.summary, source: r.source, url: r.url, publishedAt: r.publishedAt,
      country: detectCountry(text), category: cat, importance: "low", assets: impacts.map(i => i.asset), status: "developing", eventId: "" });
  }
  return out;
}

export function groupEvents(arts: Article[], official: Set<string> = new Set(["Federal Reserve", "ECB"])): EventGroup[] {
  const n = arts.length; const parent = arts.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const tk = arts.map(a => new Set(tokens(a.title)));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const jac = jaccard(tk[i], tk[j]);
    let shared = 0; tk[i].forEach(w => tk[j].has(w) && shared++);
    if (jac >= 0.5 || (jac >= 0.34 && shared >= 4)) parent[find(j)] = find(i);
  }
  const groups = new Map<number, Article[]>();
  arts.forEach((a, i) => { const r = find(i); (groups.get(r) ?? groups.set(r, []).get(r)!).push(a); });
  const out: EventGroup[] = [];
  groups.forEach(list => {
    list.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
    const lead = list[0]; const sources = [...new Set(list.map(a => a.source))];
    const text = list.map(a => a.title + ". " + a.summary).join(" ");
    const cat = classify(text), isOfficial = list.some(a => official.has(a.source));
    const assets = [...new Set(list.flatMap(a => a.assets))];
    const status = eventStatus(text, sources.length, isOfficial);
    const imp = scoreImportance(text, cat, isOfficial, sources.length, assets.length);
    const id = hash(list.map(a => a.id).sort()[0]);
    list.forEach(a => { a.eventId = id; a.status = status; a.importance = imp; a.category = cat === "other" ? a.category : cat; });
    out.push({ id, title: lead.title, articles: list, sources, status, importance: imp, category: cat, country: lead.country ?? list.find(a => a.country)?.country ?? null, assets, latest: lead.publishedAt });
  });
  return out.sort((a, b) => +new Date(b.latest) - +new Date(a.latest));
}

/* ---------- Analysis (rule-based, pluggable) ---------- */
export interface AnalysisProvider { analyze(ev: EventGroup): Promise<Analysis> | Analysis }
export const rulesProvider: AnalysisProvider = { analyze: analyzeEvent };

export function analyzeEvent(ev: EventGroup): Analysis {
  const text = ev.articles.map(a => a.title + ". " + a.summary).join(" ");
  const impacts = assetsFor(text);
  const matched = RULES.filter(r => r.test.test(text));
  const watch = [...new Set(matched.flatMap(r => r.watch))].slice(0, 6);
  const nSrc = ev.sources.length;
  const level = ev.status === "confirmed" && nSrc >= 3 ? "high" : ev.status === "unverified" ? "low" : "medium";
  const labels = matched.map(m => m.label.toLowerCase());
  const best = impacts[0];
  return {
    eventId: ev.id, impacts,
    scenarios: impacts.length ? [
      { name: "Scenario A — priced in / muted", description: "Markets had already discounted this development, so price reaction is small or fades quickly.", assets: impacts.slice(0, 3).map(i => i.asset).join(", ") },
      { name: "Scenario B — follows the typical mechanism", description: best ? `The most direct channel plays out: ${best.mechanism}` : "Typical transmission channels apply.", assets: impacts.filter(i => i.directness === "direct").map(i => i.asset).join(", ") || impacts[0].asset },
      { name: "Scenario C — offsetting factor dominates", description: best ? best.alternative : "Another driver (liquidity, positioning, other news) outweighs this story.", assets: impacts.slice(0, 4).map(i => i.asset).join(", ") },
    ] : [],
    sections: {
      what: `${ev.title}. Reported by ${nSrc} source${nSrc > 1 ? "s" : ""} (${ev.sources.slice(0, 4).join(", ")}). Status: ${ev.status}.`,
      why: matched.length ? `This touches ${labels.join(" and ")}. Such developments can shift expectations for rates, risk appetite or supply/demand, which feed into asset pricing.` : "No clear market-transmission channel was identified by the rule set; the story may have limited market relevance.",
      assets: impacts.length ? impacts.map(i => `${i.asset} (${i.directness}, ${i.direction})`).join("; ") : "None identified.",
      scenarios: impacts.length ? "Three non-exclusive scenarios are shown: priced-in/muted, typical mechanism, and offsetting factor. None is a forecast." : "—",
      reaction: impacts.length ? "Markets react to the gap between what happened and what was expected. Positioning, liquidity and concurrent news can dominate, so the same headline can produce opposite moves." : "—",
      watch: watch.length ? watch : ["Follow-up reporting from primary sources"],
      confidence: { level, note: `${nSrc} distinct source(s); status ${ev.status}. Analysis is keyword/rule-based and cannot read full article context. Correlation with past moves is not proof of causation.` },
    },
  };
}
