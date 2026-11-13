import { test } from "node:test"; import assert from "node:assert/strict";
import { buildArticles, groupEvents, analyzeEvent, detectCountry, classify } from "../lib/analysis/engine";
import { parseFeed } from "../lib/providers/news";
import { parseStooq } from "../lib/providers/quotes";

const raw = (title: string, source: string, url: string, summary = "") => ({ title, summary, source, url, publishedAt: new Date().toISOString() });

test("dedupes same url and groups same event across sources", () => {
  const arts = buildArticles([
    raw("Fed cuts interest rates by 25 basis points", "CNBC", "https://a.com/1?x=1"),
    raw("Fed cuts interest rates by 25 basis points", "CNBC", "https://a.com/1"),
    raw("Federal Reserve cuts interest rates by 25 basis points, Powell says", "BBC News", "https://b.com/2"),
    raw("Bitcoin ETF sees record inflows", "CoinDesk", "https://c.com/3"),
  ]);
  assert.equal(arts.length, 3);
  const ev = groupEvents(arts);
  assert.equal(ev.length, 2);
  const fed = ev.find(e => e.title.toLowerCase().includes("fed"))!;
  assert.equal(fed.sources.length, 2); assert.equal(fed.status, "confirmed");
});
test("single-source rumour is unverified and impact never auto-bullish", () => {
  const ev = groupEvents(buildArticles([raw("Bitcoin to hit $1m, sources say, reportedly", "X", "https://x.com/1")]))[0];
  assert.equal(ev.status, "unverified");
  const a = analyzeEvent(ev);
  assert.ok(a.impacts.length > 0); assert.ok(a.impacts.every(i => i.direction !== "positive" && i.direction !== "negative"), "rumour about crypto must not produce a directional call");
  assert.equal(a.sections.confidence.level, "low");
});
test("rate cut gives scenario text and USD negative", () => {
  const ev = groupEvents(buildArticles([raw("Fed cuts rates as inflation cools", "BBC News", "https://b.com/9")]))[0];
  const a = analyzeEvent(ev); assert.equal(a.impacts.find(i => i.asset === "DXY")?.direction, "negative"); assert.equal(a.scenarios.length, 3);
});
test("country and category", () => { assert.ok(["UA","RU"].includes(detectCountry("Russia strikes Ukraine's Kyiv")!)); assert.equal(classify("OPEC cuts oil output"), "energy"); });
test("rss parse", () => {
  const x = `<rss><channel><item><title>Hello &amp; world</title><link>http://a/1</link><description><![CDATA[<p>Hi</p>]]></description><pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate></item></channel></rss>`;
  const r = parseFeed(x, "T"); assert.equal(r[0].title, "Hello & world"); assert.equal(r[0].summary, "Hi");
});
test("stooq csv", () => { const b = parseStooq("Date,Open,High,Low,Close,Volume\n2024-01-02,1,2,0,10,5\n2024-01-03,1,2,0,11,5"); assert.equal(b.length, 2); assert.equal(b[1].c, 11); });

test("tariff headline does not trigger conflict rule", () => {
  const ev = groupEvents(buildArticles([raw("Trump announces new tariffs as trade tensions escalate", "BBC News", "https://b.com/t")]))[0];
  assert.ok(!analyzeEvent(ev).sections.why.includes("armed conflict"));
});
import { parseYahoo } from "../lib/providers/quotes";
test("yahoo chart parse skips null closes", () => {
  const b = parseYahoo({ chart: { result: [{ timestamp: [1, 2, 3], indicators: { quote: [{ close: [10, null, 12] }] } }] } });
  assert.equal(b.length, 2); assert.equal(b[1].c, 12);
});
test("impact strength ranks central bank above generic crypto chatter", () => {
  const ev = groupEvents(buildArticles([raw("Fed cuts interest rates by 25 basis points", "BBC News", "https://b.com/f"), raw("Fed cuts interest rates by 25 basis points, Powell says", "CNBC", "https://c.com/f"), raw("Bitcoin whales move coins", "X", "https://x.com/b"), raw("Local football club wins cup", "Y", "https://y.com/f")]));
  const f = (k: string) => ev.find(e => e.title.toLowerCase().includes(k))!.impactScore;
  assert.ok(f("fed") >= 65); assert.ok(f("fed") > f("bitcoin")); assert.ok(f("football") < 35);
});
