#!/usr/bin/env node
/**
 * 从飞书多维表格同步岗位到 Job 表。
 *
 * 运行模式：
 *   FULL_BACKFILL=1 node scripts/feishu-jobs-sync.js  # 首次全量
 *   node scripts/feishu-jobs-sync.js                  # 每日增量
 *
 * 必需环境变量：
 *   FEISHU_APP_ID, FEISHU_APP_SECRET
 *   FEISHU_BASE_TOKEN (默认使用项目岗位 Base)
 *   FEISHU_JOBS_TABLE_ID (默认使用 27 届岗位表)
 *   DATABASE_URL
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const DEFAULT_BASE_TOKEN = 'PNznbO67dacmJise1spcWtulnke';
const DEFAULT_TABLE_ID = 'tbl22lU5HS4ogMzB';
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';
const PAGE_SIZE = 500;
const WRITE_CHUNK_SIZE = 200;

const FIELD = {
  company: '公司',
  role: '岗位',
  industry: '公司行业',
  batch: '届次',
  recruitType: '招聘类型',
  location: '工作地点',
  startDate: '开始时间',
  endDate: '截止日期',
  announcement: '公告链接',
  apply: '投递链接',
  writtenTest: '是否免笔试',
  salary: '薪资',
  remark: '备注',
};

const prisma = new PrismaClient();

function normalizeText(value) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cellToText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return normalizeText(value);
  if (Array.isArray(value)) return value.map(cellToText).filter(Boolean).join(';');
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return normalizeText(value.text);
    if (typeof value.name === 'string') return normalizeText(value.name);
    if (typeof value.value === 'string') return normalizeText(value.value);
    if (Array.isArray(value.text)) return value.text.map(cellToText).filter(Boolean).join('');
    return '';
  }
  return normalizeText(value);
}

function cellToList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(cellToText).map(normalizeText).filter(Boolean);
  const text = cellToText(value);
  return text ? text.split(/[;；,，、]/).map(normalizeText).filter(Boolean) : [];
}

function extractUrl(value) {
  const text = cellToText(value);
  const markdown = text.match(/\((https?:\/\/[^)]+)\)/i);
  if (markdown) return markdown[1].trim();
  const direct = text.match(/https?:\/\/\S+/i);
  return direct ? direct[0].replace(/[),，。；;]+$/, '') : '';
}

function parseDateValue(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? normalizeText(value) : date.toISOString().slice(0, 10);
}

function parseDeadline(value, startDate) {
  const text = normalizeText(value);
  if (!text) return '';
  if (/招满即止|长期招聘|不限/.test(text)) return '招满即止';
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(text)) {
    const parts = text.split(/[-/.]/).map(Number);
    return `${parts[0].toString().padStart(4, '0')}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
  }
  const base = new Date(startDate || new Date());
  const match = text.match(/^(\d{1,2})[月/.\-](\d{1,2})(?:日)?$/);
  if (match) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    return `${base.getUTCFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const monthDay = text.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (monthDay) return `${base.getUTCFullYear()}-${String(Number(monthDay[1])).padStart(2, '0')}-${String(Number(monthDay[2])).padStart(2, '0')}`;
  return text;
}

function mapIndustry(values) {
  const text = cellToList(values).join(';');
  if (/互联网|科技|网络通信|电子商务|电商|通信/.test(text)) return '互联网';
  if (/金融|银行|保险|证券|基金/.test(text)) return '金融';
  if (/国央企|央国企|国企|研究所|事业单位|能源/.test(text)) return '国央企';
  if (/外企|中外合资/.test(text)) return '外企';
  if (/制造|汽车|新能源|半导体|机电|电器|化工/.test(text)) return '制造业';
  return text || '其他';
}

function mapRecruitType(values, batchValues) {
  const text = cellToList(values).join(';');
  const fallback = cellToList(batchValues).join(';');
  const value = text || fallback;
  return value.replace(/20(\d{2})届/g, (_, year) => `${year.slice(-2)}届`);
}

function mapNoWrittenTest(values) {
  const text = cellToList(values).join(';');
  return /含免笔试|仅测评|免笔试/.test(text) ? 'true' : 'false';
}

function fingerprint(job) {
  return [job.company, job.roles, job.locations, job.startDate, job.announcementLink]
    .map(normalizeText)
    .join('|')
    .toLowerCase();
}

function normalizeFeishuRecord(record) {
  const fields = record.fields || record;
  const startDate = parseDateValue(fields[FIELD.startDate]);
  const recordId = record.record_id || record.recordId || '';
  const job = {
    sourceKey: recordId ? `feishu:${recordId}` : '',
    company: normalizeText(cellToText(fields[FIELD.company])),
    industry: mapIndustry(fields[FIELD.industry]),
    recruitType: mapRecruitType(fields[FIELD.batch], fields[FIELD.recruitType]),
    locations: cellToList(fields[FIELD.location]).join(','),
    startDate,
    endDate: parseDeadline(cellToText(fields[FIELD.endDate]), startDate),
    noWrittenTest: mapNoWrittenTest(fields[FIELD.writtenTest]),
    roles: cellToList(fields[FIELD.role]).join(','),
    announcementLink: extractUrl(fields[FIELD.announcement]),
    applyLink: extractUrl(fields[FIELD.apply]),
    remark: normalizeText(cellToText(fields[FIELD.remark])),
    batch: cellToList(fields[FIELD.recruitType]).join(',').slice(0, 8),
    salary: normalizeText(cellToText(fields[FIELD.salary])),
  };
  job.fingerprint = fingerprint(job);
  return job;
}

function dedupeJobs(jobs, existingSourceKeys = new Set(), existingFingerprints = new Set()) {
  const seenSourceKeys = new Set();
  const seenFingerprints = new Set();
  const unique = [];
  let skippedBySourceKey = 0;
  let skippedByFingerprint = 0;
  const sourceKeyOccurrences = new Map();
  for (const job of jobs) {
    const key = normalizeText(job.sourceKey);
    if (key) sourceKeyOccurrences.set(key, (sourceKeyOccurrences.get(key) || 0) + 1);
  }
  const sourceKeyIndexes = new Map();
  for (const job of jobs) {
    const key = normalizeText(job.sourceKey);
    const jobFingerprint = job.fingerprint || fingerprint(job);
    const keyIndex = sourceKeyIndexes.get(key) || 0;
    sourceKeyIndexes.set(key, keyIndex + 1);
    if (!key) {
      if (seenFingerprints.has(jobFingerprint) || existingFingerprints.has(jobFingerprint)) {
        skippedByFingerprint++;
        continue;
      }
      seenFingerprints.add(jobFingerprint);
      unique.push(job);
      continue;
    }
    if (seenSourceKeys.has(key)) {
      if (seenFingerprints.has(jobFingerprint)) skippedByFingerprint++;
      else skippedBySourceKey++;
      continue;
    }
    if (existingSourceKeys.has(key)) {
      if (existingFingerprints.has(jobFingerprint)) skippedByFingerprint++;
      else skippedBySourceKey++;
      continue;
    }
    if (seenFingerprints.has(jobFingerprint)) {
      skippedByFingerprint++;
      continue;
    }
    seenSourceKeys.add(key);
    seenFingerprints.add(jobFingerprint);
    unique.push(job);
  }
  return { unique, skippedBySourceKey, skippedByFingerprint };
}

async function getTenantAccessToken() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) throw new Error('缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET');
  const response = await axios.post(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    app_id: appId,
    app_secret: appSecret,
  }, { timeout: 30000 });
  if (response.data?.code !== 0 || !response.data?.tenant_access_token) {
    throw new Error(`飞书鉴权失败: ${response.data?.msg || '未返回 token'}`);
  }
  return response.data.tenant_access_token;
}

async function fetchFeishuRecords(token, { sinceDate = null } = {}) {
  const appToken = process.env.FEISHU_BASE_TOKEN || DEFAULT_BASE_TOKEN;
  const tableId = process.env.FEISHU_JOBS_TABLE_ID || DEFAULT_TABLE_ID;
  const all = [];
  let pageToken = '';
  let page = 0;
  while (true) {
    const response = await axios.get(`${FEISHU_API_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page_size: PAGE_SIZE, page_token: pageToken || undefined, user_id_type: 'open_id' },
      timeout: 60000,
    });
    const data = response.data;
    if (data?.code !== 0) throw new Error(`飞书岗位表读取失败: ${data?.msg || data?.code}`);
    const items = data.data?.items || [];
    for (const record of items) {
      if (!sinceDate || String(record.created_time || '').slice(0, 10) >= sinceDate) all.push(record);
    }
    page++;
    console.log(`📥 飞书岗位表第 ${page} 页：${items.length} 条，累计命中 ${all.length}`);
    if (!data.data?.has_more) break;
    pageToken = data.data.page_token;
    if (!pageToken) throw new Error('飞书分页返回 has_more=true 但没有 page_token');
  }
  return all;
}

function dateInShanghai(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(date);
}

async function loadExistingKeys() {
  const rows = await prisma.job.findMany({ select: { sourceKey: true, company: true, roles: true, locations: true, startDate: true, announcementLink: true } });
  const sourceKeys = new Set(rows.map((row) => row.sourceKey).filter(Boolean));
  const fingerprints = new Set(rows.map(fingerprint));
  return { sourceKeys, fingerprints };
}

function toPrismaData(job) {
  const { fingerprint: _fingerprint, ...data } = job;
  return {
    ...data,
    sourceKey: data.sourceKey,
    endDate: data.endDate || null,
    startDate: data.startDate || null,
    announcementLink: data.announcementLink || null,
    applyLink: data.applyLink || null,
    remark: data.remark || null,
    batch: data.batch || null,
    salary: data.salary || null,
  };
}

async function saveJobs(jobs) {
  let inserted = 0;
  for (let i = 0; i < jobs.length; i += WRITE_CHUNK_SIZE) {
    const chunk = jobs.slice(i, i + WRITE_CHUNK_SIZE).map(toPrismaData);
    if (!chunk.length) continue;
    const result = await prisma.job.createMany({ data: chunk, skipDuplicates: true });
    inserted += result.count;
    console.log(`💾 写入 ${Math.min(i + chunk.length, jobs.length)}/${jobs.length}，实际新增 ${inserted}`);
  }
  return inserted;
}

async function main() {
  const full = process.env.FULL_BACKFILL === '1';
  const existing = await loadExistingKeys();
  const sinceDate = full || existing.sourceKeys.size === 0 ? null : dateInShanghai(new Date(Date.now() - 86400000));
  console.log(full ? '📦 飞书岗位同步：全量模式' : `🗓️ 飞书岗位同步：增量模式（${sinceDate || '首次全量'}）`);
  const token = await getTenantAccessToken();
  const records = await fetchFeishuRecords(token, { sinceDate });
  const normalized = records.map(normalizeFeishuRecord).filter((job) => job.company && job.roles);
  const deduped = dedupeJobs(normalized, existing.sourceKeys, existing.fingerprints);
  const inserted = await saveJobs(deduped.unique);
  console.log(JSON.stringify({
    mode: full ? 'full' : 'incremental',
    sourceRecords: records.length,
    validRecords: normalized.length,
    inserted,
    skippedBySourceKey: deduped.skippedBySourceKey,
    skippedByFingerprint: deduped.skippedByFingerprint,
  }));
  return { inserted, ...deduped };
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`❌ 飞书岗位同步失败: ${error.message}`);
    process.exitCode = 1;
  }).finally(async () => {
    await prisma.$disconnect();
  });
}

module.exports = {
  normalizeFeishuRecord,
  extractUrl,
  parseDeadline,
  dedupeJobs,
  fingerprint,
};
