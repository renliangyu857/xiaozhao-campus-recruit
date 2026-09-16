const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeFeishuRecord,
  extractUrl,
  parseDeadline,
  dedupeJobs,
} = require('./feishu-jobs-sync.js');

test('飞书岗位记录映射为项目 Job 字段', () => {
  const job = normalizeFeishuRecord({
    record_id: 'rec_demo_1',
    公司: '  星河科技\n',
    岗位: '后端开发；算法工程师',
    公司行业: ['互联网/人工智能'],
    届次: ['2027届'],
    招聘类型: ['秋招'],
    工作地点: ['北京', '上海'],
    开始时间: '2026-09-15T00:00:00.000+08:00',
    截止日期: '10.30',
    公告链接: '[公告](https://example.com/notice)',
    投递链接: 'https://example.com/apply',
    是否免笔试: ['仅测评'],
    薪资: '20k*14',
    备注: '技术岗',
  });

  assert.equal(job.sourceKey, 'feishu:rec_demo_1');
  assert.equal(job.company, '星河科技');
  assert.equal(job.roles, '后端开发,算法工程师');
  assert.equal(job.industry, '互联网');
  assert.equal(job.recruitType, '27届');
  assert.equal(job.batch, '秋招');
  assert.equal(job.locations, '北京,上海');
  assert.equal(job.endDate, '2026-10-30');
  assert.equal(job.announcementLink, 'https://example.com/notice');
  assert.equal(job.applyLink, 'https://example.com/apply');
  assert.equal(job.noWrittenTest, 'true');
});

test('截止日期支持招满即止和带年份日期', () => {
  assert.equal(parseDeadline('招满即止', '2026-09-15T00:00:00+08:00'), '招满即止');
  assert.equal(parseDeadline('2027-01-03', '2026-09-15T00:00:00+08:00'), '2027-01-03');
  assert.equal(parseDeadline('8月8日', '2026-07-15T00:00:00+08:00'), '2026-08-08');
});

test('公告链接支持 Markdown 链接和裸链接', () => {
  assert.equal(extractUrl('[查看](https://example.com/a)'), 'https://example.com/a');
  assert.equal(extractUrl('https://example.com/b'), 'https://example.com/b');
  assert.equal(extractUrl('扫码投递'), '');
});

test('全量同步在单次输入和库内已有数据中都按稳定键去重', () => {
  const result = dedupeJobs([
    { sourceKey: 'feishu:a', company: '甲', roles: '后端', locations: '北京', startDate: '2026-09-15', announcementLink: 'https://a' },
    { sourceKey: 'feishu:a', company: '甲', roles: '后端', locations: '北京', startDate: '2026-09-15', announcementLink: 'https://a', remark: '更完整' },
    { sourceKey: 'feishu:b', company: '乙', roles: '算法', locations: '上海', startDate: '2026-09-15', announcementLink: 'https://b' },
  ], new Set(['feishu:b']), new Set(['甲|后端|北京|2026-09-15|https://a']));

  assert.equal(result.unique.length, 1);
  assert.equal(result.unique[0].sourceKey, 'feishu:a');
  assert.equal(result.skippedBySourceKey, 1);
  assert.equal(result.skippedByFingerprint, 1);
});
