import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext, validateAvatarDataUrl, validateConfirm, validateDisplayName, validateEmail, validatePassword } from "../lib/validate";
import { listToRows, portfolioFromRows, portfolioToRows, removedKeys, ruleToRow, validAsset } from "../lib/cloud-map";

test("validators", () => {
  assert.equal(validateEmail("a@b.co"), null); assert.ok(validateEmail("nope")); assert.ok(validateEmail(""));
  assert.ok(validatePassword("short1")); assert.ok(validatePassword("allletters")); assert.ok(validatePassword("12345678")); assert.equal(validatePassword("goodpass1"), null);
  assert.ok(validateConfirm("a", "b")); assert.equal(validateConfirm("a", "a"), null);
  assert.ok(validateDisplayName("   ")); assert.ok(validateDisplayName("x".repeat(51))); assert.equal(validateDisplayName("Yarik"), null);
  assert.ok(validateAvatarDataUrl("data:text/html;base64,AAAA")); assert.equal(validateAvatarDataUrl("data:image/png;base64,AAAA"), null);
});
test("safeNext blocks open redirects", () => {
  assert.equal(safeNext("/portfolio"), "/portfolio"); assert.equal(safeNext("//evil.com"), "/"); assert.equal(safeNext("https://evil.com"), "/"); assert.equal(safeNext("/\\evil.com"), "/"); assert.equal(safeNext(null), "/");
});
test("watchlist rows dedupe, validate and keep order", () => {
  const rows = listToRows("u1", "watch", ["BTC", "ETH", "BTC", "bad id!", "EURUSD"]);
  assert.deepEqual(rows.map(r => [r.asset_id, r.position]), [["BTC", 0], ["ETH", 1], ["EURUSD", 2]]); assert.ok(rows.every(r => r.user_id === "u1"));
  assert.ok(!validAsset("a b"));
});
test("alert rule mapping rejects bad kinds", () => {
  assert.equal(ruleToRow("u", { id: "1", kind: "evil" as any, enabled: true } as any), null);
  assert.equal(ruleToRow("u", { id: "1", kind: "price-above", asset: "BTC", value: 100, enabled: true } as any)?.asset_id, "BTC");
});
test("portfolio round trip", () => {
  const p = { cash: 90000.123, start: 100000, positions: [{ asset: "BTC", qty: 0.1, avg: 100000 }], trades: [{ at: "2026-01-01T00:00:00.000Z", asset: "BTC", side: "buy" as const, qty: 0.1, price: 100000 }], equity: [{ t: 1767225600000, v: 100000 }] };
  const r = portfolioToRows("u", "p1", p);
  assert.equal(r.header.cash, 90000.12); assert.equal(r.assets.length, 1); assert.equal(r.trades[0].user_id, "u");
  const back = portfolioFromRows({ cash: r.header.cash, start_cash: r.header.start_cash }, r.assets, r.trades, r.history);
  assert.deepEqual(back.positions, p.positions); assert.equal(back.trades[0].at, p.trades[0].at); assert.equal(back.equity[0].t, p.equity[0].t);
});
test("removedKeys", () => { assert.deepEqual(removedKeys(["a", "b", "c"], ["b"]), ["a", "c"]); });
