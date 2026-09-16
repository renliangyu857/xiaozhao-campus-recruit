#!/usr/bin/env node
/**
 * 从本地岗位 Excel 同步到 Job 表。
 *
 * 首次全量：FULL_BACKFILL=1 node scripts/excel-jobs-sync.js <xlsx-path>
 * 后续增量：node scripts/excel-jobs-sync.js <xlsx-path>
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const DEFAULT_FILE = '/Users/apple/Downloads/yx-files/27届暑期实习+秋招+春招信息汇总表（持续更新到27 年7月） —鲨鲨.xlsx';
const DEFAULT_SHEET = '27届暑期实习+秋招+春招';
const WRITE_CHUNK_SIZE = 200;

const FIELD = {
  company: '公司', industry: '公司行业', recruitType: '招聘类型', locations: '工作地点',
  startDate: '开始时间', endDate: '截止日期', writtenTest: '是否免笔试', roles: '岗位',
  announcement: '公告链接', apply: '投递链接', cohort: '届次', salary: '薪资',
  education: '学历要求', remark: '备注',
};

const prisma = new PrismaClient();

function normalizeText(value) {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitList(value) {
  return normalizeText(value).split(/[;,；，、|]+/).map(normalizeText).filter(Boolean);
}

function extractUrl(value) {
  const text = normalizeText(value);
  const match = text.match(/https?:\/\/\S+/i);
  return match ? match[0].replace(/[),，。；;]+$/, '') : '';
}

function parseDate(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const date = new Date(text.replace(/\//g, '-'));
  return Number.isNaN(date.getTime()) ? text : date.toISOString().slice(0, 10);
}

function parseDeadline(value, startDate) {
  const text = normalizeText(value);
  if (!text) return '';
  if (/招满即停|招满即止|长期招聘|不限/.test(text)) return '招满即止';
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(text)) {
    const [year, month, day] = text.split(/[-/.]/).map(Number);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const match = text.match(/^(\d{1,2})[月/.\-](\d{1,2})(?:日)?$/);
  if (match) {
    const baseYear = (startDate || '').slice(0, 4) || String(new Date().getFullYear());
    return `${baseYear}-${String(Number(match[1])).padStart(2, '0')}-${String(Number(match[2])).padStart(2, '0')}`;
  }
  return text;
}

function mapIndustry(value) {
  const text = splitList(value).join(';');
  if (/互联网|科技|网络通信|电子商务|电商|通信/.test(text)) return '互联网';
  if (/金融|银行|保险|证券|基金/.test(text)) return '金融';
  if (/国央企|央国企|国企|研究所|事业单位|能源/.test(text)) return '国央企';
  if (/外企|中外合资/.test(text)) return '外企';
  if (/制造|汽车|新能源|半导体|机电|电器|化工/.test(text)) return '制造业';
  return text || '其他';
}

function mapRecruitType(value, cohort) {
  const text = normalizeText(value) || normalizeText(cohort);
  return text.replace(/20(\d{2})届/g, (_, year) => `${year.slice(-2)}届`);
}

function mapNoWrittenTest(value) {
  return /免笔试|仅测评|无需笔试/.test(normalizeText(value)) ? 'true' : 'false';
}

function buildJob(row, rowNumber, sourceFile) {
  const startDate = parseDate(row[FIELD.startDate]);
  const announcementLink = extractUrl(row[FIELD.announcement]);
  const applyLink = extractUrl(row[FIELD.apply]);
  const job = {
    sourceKey: `excel:${crypto.createHash('sha256').update(`${path.basename(sourceFile)}|${rowNumber}`).digest('hex').slice(0, 48)}`,
    company: normalizeText(row[FIELD.company]).slice(0, 128),
    industry: mapIndustry(row[FIELD.industry]).slice(0, 32),
    recruitType: mapRecruitType(row[FIELD.cohort], row[FIELD.recruitType]).slice(0, 32),
    locations: splitList(row[FIELD.locations]).join(',').slice(0, 512),
    startDate,
    endDate: parseDeadline(row[FIELD.endDate], startDate).slice(0, 32),
    noWrittenTest: mapNoWrittenTest(row[FIELD.writtenTest]),
    roles: splitList(row[FIELD.roles]).join(',').slice(0, 512),
    announcementLink: announcementLink.slice(0, 512),
    applyLink: applyLink.slice(0, 512),
    remark: [normalizeText(row[FIELD.education]), normalizeText(row[FIELD.remark])].filter(Boolean).join('；').slice(0, 1024),
    batch: normalizeText(row[FIELD.recruitType]).slice(0, 8),
    salary: normalizeText(row[FIELD.salary]).slice(0, 64),
  };
  job.fingerprint = fingerprint(job);
  return job;
}

function fingerprint(job) {
  return [job.company, job.roles, job.locations, job.startDate, job.announcementLink]
    .map(normalizeText).join('|').toLowerCase();
}

function readExcel(filePath, sheetName = DEFAULT_SHEET) {
  if (!fs.existsSync(filePath)) throw new Error(`Excel 文件不存在：${filePath}`);
  const workbook = XLSX.readFile(filePath, { cellDates: false, raw: false });
  const actualSheet = workbook.SheetNames.includes(sheetName) ? sheetName : workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[actualSheet], { defval: '', raw: false });
  return { sheetName: actualSheet, rows };
}

function dedupeJobs(jobs, existingSourceKeys = new Set(), existingFingerprints = new Set()) {
  const seenKeys = new Set();
  const seenFingerprints = new Set();
  const unique = [];
  let skippedBySourceKey = 0;
  let skippedByFingerprint = 0;
  for (const job of jobs) {
    const fp = job.fingerprint || fingerprint(job);
    if (!job.sourceKey || seenKeys.has(job.sourceKey) || existingSourceKeys.has(job.sourceKey)) {
      skippedBySourceKey++;
      continue;
    }
    if (seenFingerprints.has(fp) || existingFingerprints.has(fp)) {
      skippedByFingerprint++;
      continue;
    }
    seenKeys.add(job.sourceKey);
    seenFingerprints.add(fp);
    unique.push(job);
  }
  return { unique, skippedBySourceKey, skippedByFingerprint };
}

async function loadExistingKeys() {
  const rows = await prisma.job.findMany({
    select: { sourceKey: true, company: true, roles: true, locations: true, startDate: true, announcementLink: true },
  });
  return {
    sourceKeys: new Set(rows.map((row) => row.sourceKey).filter(Boolean)),
    fingerprints: new Set(rows.map(fingerprint)),
  };
}

function toPrismaData(job) {
  const { fingerprint: _fingerprint, ...data } = job;
  return {
    ...data,
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
    const result = await prisma.job.createMany({
      data: jobs.slice(i, i + WRITE_CHUNK_SIZE).map(toPrismaData),
      skipDuplicates: true,
    });
    inserted += result.count;
  }
  return inserted;
}

async function main(filePath = process.argv[2] || DEFAULT_FILE) {
  const { sheetName, rows } = readExcel(filePath);
  const jobs = rows.map((row, index) => buildJob(row, index + 2, filePath)).filter((job) => job.company && job.roles);
  const existing = await loadExistingKeys();
  const deduped = dedupeJobs(jobs, existing.sourceKeys, existing.fingerprints);
  const inserted = await saveJobs(deduped.unique);
  const result = {
    sourceFile: filePath,
    sheetName,
    sourceRows: rows.length,
    validRows: jobs.length,
    inserted,
    skippedBySourceKey: deduped.skippedBySourceKey,
    skippedByFingerprint: deduped.skippedByFingerprint,
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Excel 岗位同步失败：${error.message}`);
    process.exitCode = 1;
  }).finally(() => prisma.$disconnect());
}

module.exports = { normalizeText, extractUrl, parseDate, parseDeadline, buildJob, fingerprint, readExcel, dedupeJobs };
