import assert from "node:assert/strict";
import test from "node:test";

const modulePath = "./payment-config.ts";
const { calculateVipValidity } = await import(modulePath);

test("购买永久会员时应立即生效，不应等待体验会员结束", () => {
  const now = new Date("2026-09-15T14:40:00.000Z");
  const trialEnd = new Date("2026-09-17T11:51:46.926Z");
  const result = calculateVipValidity("lifetime", trialEnd, now);

  assert.equal(result.startAt.toISOString(), now.toISOString());
  assert.equal(result.endAt.toISOString(), "2099-12-31T23:59:59.000Z");
});
