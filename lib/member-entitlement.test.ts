import assert from "node:assert/strict";
import test from "node:test";

const modulePath = "./member-entitlement.ts";
const { getMemberEntitlement, selectActiveMember } = await import(modulePath);

test("永久会员权益应覆盖资料下载且不是体验会员", () => {
  const result = getMemberEntitlement({
    planId: "lifetime",
    startAt: new Date("2026-09-15T12:00:00.000Z"),
    endAt: new Date("2099-12-31T23:59:59.000Z"),
  }, new Date("2026-09-15T13:00:00.000Z"));

  assert.equal(result.isVip, true);
  assert.equal(result.isTrial, false);
  assert.equal(result.canDownloadMaterials, true);
});

test("永久会员即使记录排在体验会员后也应被识别为当前会员", () => {
  const now = new Date("2026-09-15T14:40:00.000Z");
  const active = selectActiveMember([
    {
      planId: "lifetime",
      startAt: new Date("2026-09-15T14:39:00.000Z"),
      endAt: new Date("2099-12-31T23:59:59.000Z"),
    },
    {
      planId: "trial",
      startAt: new Date("2026-09-15T11:51:46.926Z"),
      endAt: new Date("2026-09-17T11:51:46.926Z"),
    },
  ], now);

  assert.equal(active?.planId, "lifetime");
});

test("体验会员不应获得永久资料下载权益", () => {
  const result = getMemberEntitlement({
    planId: "trial",
    startAt: new Date("2026-09-15T12:00:00.000Z"),
    endAt: new Date("2026-09-17T12:00:00.000Z"),
  }, new Date("2026-09-15T13:00:00.000Z"));

  assert.equal(result.isVip, true);
  assert.equal(result.isTrial, true);
  assert.equal(result.canDownloadMaterials, false);
});
