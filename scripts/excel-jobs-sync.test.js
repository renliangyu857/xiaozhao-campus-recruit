const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeText,
  extractUrl,
  parseDate,
  parseDeadline,
  buildJob,
  fingerprint,
  dedupeJobs,
} = require('./excel-jobs-sync.js');

test('Excel 字段映射为项目 Job 字段', () => {
  const job = buildJob({
    公司: '  星河科技\n',
    岗位: '后端开发;算法工程师',
    公司行业: '互联网,人工智能',
    招聘类型: '秋招',
    工作地点: '北京,上海',
    开始时间: '2026/09/15',
    截止日期: '10.30',
    公告链接: '[公告](https://example.com/notice)',
    投递链接: '扫码投递',
    是否免笔试: '免笔试',
    届次: '2027届',
    薪资: '20k*14',
    学历要求: '本科',
    备注: '技术岗',
  }, 2, '/tmp/sample.xlsx');

  assert.equal(job.company, '星河科技');
  assert.equal(job.roles, '后端开发,算法工程师');
  assert.equal(job.industry, '互联网');
  assert.equal(job.recruitType, '27届');
  assert.equal(job.batch, '秋招');
  assert.equal(job.locations, '北京,上海');
  assert.equal(job.startDate, '2026-09-15');
  assert.equal(job.endDate, '2026-10-30');
  assert.equal(job.announcementLink, 'https://example.com/notice');
  assert.equal(job.applyLink, '');
  assert.equal(job.noWrittenTest, 'true');
  assert.equal(job.salary, '20k*14');
  assert.match(job.sourceKey, /^excel:[0-9a-f]{48}$/);
  assert.ok(job.remark.includes('本科'));
});

test('截止日期支持招满即停、月日、纯日期', () => {
  assert.equal(parseDeadline('招满即停', '2026-09-15'), '招满即止');
  assert.equal(parseDeadline('2027-01-03', '2026-09-15'), '2027-01-03');
  assert.equal(parseDeadline('10.30', '2026-09-15'), '2026-10-30');
});

test('日期解析兼容中文斜杠', () => {
  assert.equal(parseDate('2026/09/15'), '2026-09-15');
  assert.equal(parseDate('2025-12-01'), '2025-12-01');
});

test('公告链接支持 Markdown、裸链接与扫码文本', () => {
  assert.equal(extractUrl('[查看](https://example.com/a)'), 'https://example.com/a');
  assert.equal(extractUrl('https://example.com/b'), 'https://example.com/b');
  assert.equal(extractUrl('扫码投递'), '');
  assert.equal(extractUrl('见 https://example.com/c)'), 'https://example.com/c');
});

test('去重按稳定 sourceKey 和指纹组合进行', () => {
  const a = { sourceKey: 'excel:a', company: '甲', roles: '后端', locations: '北京', startDate: '2026-09-15', announcementLink: 'https://a' };
  a.fingerprint = fingerprint(a);
  const b = { sourceKey: 'excel:b', company: '甲', roles: '后端', locations: '北京', startDate: '2026-09-15', announcementLink: 'https://a' };
  b.fingerprint = fingerprint(b);
  const c = { sourceKey: 'excel:c', company: '乙', roles: '算法', locations: '上海', startDate: '2026-09-15', announcementLink: 'https://b' };
  c.fingerprint = fingerprint(c);

  const result = dedupeJobs([a, b, c], new Set(['excel:b']), new Set([fingerprint(a)]));
  assert.equal(result.unique.length, 1);
  assert.equal(result.unique[0].sourceKey, 'excel:c');
  assert.equal(result.skippedBySourceKey, 1);
  assert.equal(result.skippedByFingerprint, 1);
});