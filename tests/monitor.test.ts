import { test } from "node:test";
import assert from "node:assert/strict";
import { monitorLevel } from "../lib/monitor/importance";
import { matchExisting } from "../lib/monitor/match";
import { parseAnalysis } from "../lib/monitor/validate";
import { matchesPrefs } from "../lib/monitor/prefs";
import { buildBriefing, rulesSummary } from "../lib/monitor/briefing-core";
import { cronAuth } from "../lib/cron-auth";
import { detectAssets, scoreEvent } from "../lib/ai/context";

const now = Date.now(); const iso = (h = 0) => new Date(now - h * 36e5).toISOString();
const ev = (o: any = {}) => ({ category: "central-banks", country: "US", sources: ["Federal Reserve", "CNBC", "BBC"], assets: ["EURUSD", "XAU", "BTC", "SPX"], status: "confirmed", latest: iso(1), impactScore: 70, ...o });

test("importance levels", () => {
  assert.equal(monitorLevel(ev(), true, now).level, "critical");
  assert.equal(monitorLevel(ev({ sources: ["x"], assets: [], category: "other", country: null, status: "unverified", impactScore: 10, latest: iso(50) }), false, now).level, "low");
  assert.ok(["high", "medium"].includes(monitorLevel(ev({ sources: ["a", "b"], status: "developing", impactScore: 40 }), false, now).level));
});
test("event matching across runs", () => {
  const ex = [{ id: "1", title: "Fed holds interest rates steady as inflation cools" }, { id: "2", title: "Bitcoin falls below 60,000" }];
  assert.equal(matchExisting("Fed holds interest rates steady, inflation cools", ex), "1");
  assert.equal(matchExisting("Oil jumps after pipeline attack", ex), null);
});
test("AI analysis parsing drops invalid data", () => {
  const raw = 'Here:\n{"what":"Fed holds rates","confirmed":["Held at 4.5%"],"assets":[{"asset":"EURUSD","directness":"direct","impact":"positive","reasoning":"USD yields","confidence":1.7},{"asset":"FAKECOIN","impact":"positive","reasoning":"x","confidence":0.5},{"asset":"BTC","impact":"moon","reasoning":"y","confidence":"abc"}],"scenarios":[{"name":"a","description":"b"},{"name":"","description":"c"}]}';
  const a = parseAnalysis(raw)!; assert.equal(a.assets.length, 2); assert.equal(a.assets[0].confidence, 1); assert.equal(a.assets[1].impact, "uncertain"); assert.equal(a.scenarios.length, 1);
  assert.equal(parseAnalysis("no json"), null); assert.equal(parseAnalysis('{"what":""}'), null);
});
test("notification preference matching", () => {
  const p = { enabled: true, in_app: true, min_importance: "high" as const, assets: [], categories: [], countries: [] };
  const e = { level: "high" as const, category: "crypto", country: null, assets: ["BTC"] };
  assert.ok(matchesPrefs(p, e)); assert.ok(!matchesPrefs({ ...p, enabled: false }, e)); assert.ok(!matchesPrefs({ ...p, min_importance: "critical" }, e));
  assert.ok(!matchesPrefs({ ...p, assets: ["ETH"] }, e)); assert.ok(matchesPrefs({ ...p, assets: ["BTC"], categories: ["crypto"] }, e));
  assert.ok(!matchesPrefs({ ...p, countries: ["US"] }, e)); assert.ok(!matchesPrefs({ ...p, in_app: false }, e));
});
test("briefing builder + rule summary", () => {
  const rows = [{ id: "a", title: "Fed holds", importance: "high", category: "central-banks", country: "US", status: "confirmed", impact_score: 70, assets: ["EURUSD", "XAU"], source_count: 3, latest_published: iso(1) },
    { id: "b", title: "Bitcoin ETF rumour", importance: "medium", category: "crypto", country: null, status: "unverified", impact_score: 30, assets: ["BTC"], source_count: 1, latest_published: iso(2) }];
  const b = buildBriefing(rows, new Map([["a", { url: "https://x.test/a", published: iso(1) }]]), [], "2026-11-14");
  assert.equal(b.top[0].id, "a"); assert.equal(b.top[0].link, "https://x.test/a"); assert.equal(b.crypto[0].id, "b"); assert.ok(b.uncertainties[0].includes("Bitcoin ETF"));
  assert.ok(rulesSummary(b).includes("Fed holds")); assert.ok(rulesSummary({ ...b, top: [] }).includes("No significant"));
});
test("cron auth requires the exact secret", () => {
  const mk = (h?: string) => ({ headers: { get: (k: string) => (k === "authorization" ? h ?? null : null) } }) as any;
  process.env.CRON_SECRET = "s".repeat(24);
  assert.equal(cronAuth(mk(`Bearer ${"s".repeat(24)}`)), null); assert.equal(cronAuth(mk("Bearer nope"))?.status, 401); assert.equal(cronAuth(mk())?.status, 401);
  delete process.env.CRON_SECRET; assert.equal(cronAuth(mk("Bearer x"))?.status, 503);
});
test("asset detection from questions", () => {
  assert.ok(detectAssets("How could this negotiation affect Bitcoin?").includes("BTC"));
  assert.ok(detectAssets("Why could a Fed decision influence EUR/USD?").includes("EURUSD"));
});
