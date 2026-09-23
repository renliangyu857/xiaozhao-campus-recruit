const assert = require("node:assert/strict");
const test = require("node:test");

// 复刻 scripts/crawl-jobs.js 的 from_date 解析逻辑做单元测试
function pickSinceDate({ fromDate, fullBackfill, existing }) {
  const forceFull = fullBackfill === "1";
  if (!forceFull && existing > 0) {
    if (fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      return { mode: "backfill", date: fromDate };
    }
    const y = new Date(Date.now() - 86400000);
    const sh = new Date(y.getTime() + (8 * 60 + y.getTimezoneOffset()) * 60000);
    return { mode: "incremental", date: sh.toISOString().slice(0, 10) };
  }
  return { mode: "full", date: null };
}

test("默认增量模式：使用昨天上海日期", () => {
  const r = pickSinceDate({ fromDate: "", fullBackfill: "", existing: 100 });
  assert.equal(r.mode, "incremental");
  assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
});

test("补数据模式：FROM_DATE 生效", () => {
  const r = pickSinceDate({ fromDate: "2026-09-16", fullBackfill: "", existing: 100 });
  assert.equal(r.mode, "backfill");
  assert.equal(r.date, "2026-09-16");
});

test("空表时无论 from_date 都全量", () => {
  const r = pickSinceDate({ fromDate: "2026-09-16", fullBackfill: "", existing: 0 });
  assert.equal(r.mode, "full");
});

test("强制 FULL_BACKFILL=1 走全量", () => {
  const r = pickSinceDate({ fromDate: "", fullBackfill: "1", existing: 999 });
  assert.equal(r.mode, "full");
});

test("非法 FROM_DATE 走默认增量（兜底）", () => {
  const r = pickSinceDate({ fromDate: "abc", fullBackfill: "", existing: 100 });
  assert.equal(r.mode, "incremental");
  assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
});