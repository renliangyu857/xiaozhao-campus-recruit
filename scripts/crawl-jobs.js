#!/usr/bin/env node
/**
 * 职位爬取脚本 - 定时任务
 * 每天自动从 paperball-edu API 爬取校招职位数据
 */

const path = require('path');
const rootDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(rootDir, '.env.local') });
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

// API 配置
// 新接口（2026-09 迁移自 /aicv/announcements/new_v3）：
// 响应外壳为 { data: { objects:[...], total, page, ipp } }，无 code 字段；
// 请求体用 page/ipp + 复数数组筛选；需会员 Cookie 鉴权。
const API_URL = "https://apiv2.paperball-edu.com/aicv/dashboard/announcements/member/search";

// 登录凭据从环境变量读取（GitHub Secrets: PAPERBALL_COOKIE）。
// 不再硬编码到源码，避免凭据泄露，也避免过期后无法感知。
const PAPERBALL_COOKIE = process.env.PAPERBALL_COOKIE;
if (!PAPERBALL_COOKIE) {
  console.error('❌ 未检测到 PAPERBALL_COOKIE 环境变量。请在 GitHub Secrets 中配置 paperball-edu 登录后的完整 Cookie。');
  process.exit(1);
}

const HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Content-Type': 'application/json',
  'Cookie': PAPERBALL_COOKIE,
  'Origin': 'https://web.paperball-edu.com',
  'Referer': 'https://web.paperball-edu.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

// 字段映射配置
const BATCH_MAP = {
  '秋招': [1, 2, 3],
  '春招': [4, 5, 6],
  '专场': [7, 14],
  '实习': [8, 9, 10, 11]
};

const WRITTEN_TEST_MAP = {
  1: '有笔试',
  0: '无笔试',
  3: '未告知',
  2: '部分无笔试'
};

const INDUSTRY_MAP = {
  1: '国企',
  2: '外企',
  3: '金融',
  4: '互联网',
  23: '互联网',
  5: '制造业',
  6: '游戏',
  7: '消费',
  8: '生物',
  9: '新能源',
  10: '科技',
  12: '传媒',
  16: '教育',
  17: '地产',
  18: '专业服务',
  20: '出行/酒旅',
  22: '出行/酒旅',
  21: '物流',
  15: '事业单位',
  19: '其他',
  24: '其他',
  99: '其他'
};

const CLASS_MAP = {
  7: '26届',
  6: '25届',
  3: '24届',
  1: '23届或更早',
  2: '23届或更早',
  8: '27届或更迟',
  4: '海外应届',
  5: '部分应届'
};

const SCALE_MAP = {
  1: '一线大厂',
  2: '冷门大厂',
  3: '行业翘楚',
  4: '中厂',
  5: '小厂',
  7: '其他'
};

// 字段长度限制（与 prisma/schema.prisma 的 Job 模型保持一致）
const FIELD_LIMITS = {
  company: 128,
  industry: 32,
  recruitType: 32,
  locations: 512,
  startDate: 32,
  endDate: 32,
  noWrittenTest: 16,
  roles: 512,
  announcementLink: 512,
  applyLink: 512,
  remark: 1024,
  batch: 8,
  salary: 64,
};

function stringifyField(value, separator = ';') {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (v == null) return '';
        if (typeof v === 'object') return v.name || v.title || String(v);
        return String(v);
      })
      .filter(Boolean)
      .join(separator);
  }
  if (typeof value === 'object') {
    return value.name || value.title || JSON.stringify(value);
  }
  return String(value);
}

function truncateJobStrings(job) {
  const warnings = [];
  const out = { ...job };
  for (const [key, max] of Object.entries(FIELD_LIMITS)) {
    let val = stringifyField(out[key]);
    if (val.length > max) {
      warnings.push(`${key}(${val.length}>${max})`);
      val = val.slice(0, max);
    }
    out[key] = val;
  }
  return { job: out, warnings };
}

function sanitizeJobsForDB(jobs) {
  const allWarnings = new Map();
  const sanitized = [];
  for (const j of jobs) {
    const { job, warnings } = truncateJobStrings(j);
    if (warnings.length > 0) {
      const key = warnings.join(',');
      allWarnings.set(key, (allWarnings.get(key) || 0) + 1);
    }
    sanitized.push(job);
  }
  if (allWarnings.size > 0) {
    const summary = Array.from(allWarnings.entries())
      .map(([fields, count]) => `${fields}: ${count}条`)
      .join('; ');
    console.warn(`⚠️  发现字段超长已截断：${summary}`);
  }
  return sanitized;
}

// 辅助函数
function getBatchName(typeValue) {
  if (!typeValue) return '';
  try {
    const typeInt = parseInt(typeValue);
    for (const [batchName, values] of Object.entries(BATCH_MAP)) {
      if (values.includes(typeInt)) {
        return batchName;
      }
    }
    return String(typeValue);
  } catch {
    return String(typeValue);
  }
}

function getWrittenTestName(writtenTestValue) {
  if (writtenTestValue == null || writtenTestValue === '') return '未告知';
  try {
    return WRITTEN_TEST_MAP[parseInt(writtenTestValue)] || String(writtenTestValue);
  } catch {
    return String(writtenTestValue);
  }
}

function getIndustryNames(industryTypes) {
  if (!industryTypes) return '';

  const names = [];
  if (Array.isArray(industryTypes)) {
    for (const t of industryTypes) {
      try {
        const tInt = parseInt(t);
        const name = INDUSTRY_MAP[tInt] || String(t);
        if (!names.includes(name)) names.push(name);
      } catch {
        if (!names.includes(String(t))) names.push(String(t));
      }
    }
  } else {
    try {
      const tInt = parseInt(industryTypes);
      const name = INDUSTRY_MAP[tInt] || String(industryTypes);
      names.push(name);
    } catch {
      names.push(String(industryTypes));
    }
  }

  return names.join(';');
}

function getClassNames(classTypes) {
  if (!classTypes) return '';

  const names = [];
  if (Array.isArray(classTypes)) {
    for (const t of classTypes) {
      try {
        const tInt = parseInt(t);
        const name = CLASS_MAP[tInt] || String(t);
        if (!names.includes(name)) names.push(name);
      } catch {
        if (!names.includes(String(t))) names.push(String(t));
      }
    }
  } else {
    try {
      const tInt = parseInt(classTypes);
      const name = CLASS_MAP[tInt] || String(classTypes);
      names.push(name);
    } catch {
      names.push(String(classTypes));
    }
  }

  return names.join(';');
}

function getScaleName(scaleValue) {
  if (scaleValue == null || scaleValue === '') return '';
  try {
    return SCALE_MAP[parseInt(scaleValue)] || String(scaleValue);
  } catch {
    return String(scaleValue);
  }
}

function parseCreatedAt(createdAtStr) {
  if (!createdAtStr) return new Date().toISOString();
  try {
    const date = new Date(createdAtStr);
    return !isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// 计算上海时间(Asia/Shanghai)下的日期字符串 YYYY-MM-DD。
// 公式对运行时时区无关：GitHub Actions(UTC) 与本地(UTC+8) 均得到正确上海日期。
function getShanghaiDateStr(d = new Date()) {
  const sh = new Date(d.getTime() + (8 * 60 + d.getTimezoneOffset()) * 60000);
  return sh.toISOString().slice(0, 10);
}

// 从 API 的 created_at 取日期部分 YYYY-MM-DD（兼容 "2026-09-13 09:12:33" 或 ISO）。
// 无法解析时返回 null（调用方应保守纳入，避免漏抓）。
function getCreatedDateStr(createdAtStr) {
  if (!createdAtStr) return null;
  const m = String(createdAtStr).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(m) ? m : null;
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function fetchJobsFromAPI(sinceDateStr = null) {
  if (sinceDateStr) {
    console.log(`📡 正在从 paperball-edu API 增量爬取（仅发布日期 >= ${sinceDateStr}）...`);
  } else {
    console.log('📡 正在从 paperball-edu API 全量爬取职位数据...');
  }

  const ipp = 100;
  const allJobs = [];
  let page = 1;
  let total = null;
  // 自适应早停：若接口按发布时间倒序（最新的在前面），首页出现"近期簇"后，
  // 一旦某页整页都早于 cutoff 即可提前结束，日常增量只拉 1~2 页。
  let sawRecentCluster = false;

  while (true) {
    const payload = {
      page,
      ipp,
      industry_types: [],
      city_ids: [],
      class_types: [],
      type: [],
      scale: [],
      written_test: [],
      order_by: 3,
      expired_look: 1,
      status: [2]
    };

    const response = await axios.post(API_URL, payload, {
      headers: HEADERS,
      timeout: 60000
    });

    if (response.status !== 200 || !response.data) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = response.data;
    // 新接口外壳：{ data: { objects:[...], total, page, ipp } }，无 code 字段。
    // 鉴权失败时返回 { data: null, message: "Missing or malformed JWT" }，
    // 此时 data.data.objects 为 null，下面校验会抛错使任务失败（触发飞书告警）。
    if (!data?.data?.objects || !Array.isArray(data.data.objects)) {
      throw new Error(`API 返回结构异常: ${data?.message || '缺少 data.objects'}`);
    }

    if (total === null) {
      total = data.data.total ?? 0;
    }

    const jobs = data.data.objects;
    if (jobs.length === 0) break;

    // 增量过滤：只保留发布日期 >= cutoff 的（created_at 无法解析则保守纳入，避免漏抓）
    let pageJobs = jobs;
    if (sinceDateStr) {
      pageJobs = jobs.filter(j => {
        const d = getCreatedDateStr(j.created_at);
        return d === null || d >= sinceDateStr;
      });
      const hasRecent = jobs.some(j => {
        const d = getCreatedDateStr(j.created_at);
        return d !== null && d >= sinceDateStr;
      });
      if (page === 1 && hasRecent) sawRecentCluster = true;
      // 首页曾出现近期簇（说明最新在前），且当前页整页都早于 cutoff → 后续必更旧，提前结束
      if (sawRecentCluster && pageJobs.length === 0 && page > 1) {
        console.log(`⏩ 检测到按发布时间倒序，第 ${page} 页起均早于 ${sinceDateStr}，提前结束分页（累计 ${allJobs.length}）`);
        break;
      }
    }

    allJobs.push(...pageJobs);
    console.log(`✅ 第 ${page} 页：本页 ${jobs.length} 个，命中增量 ${pageJobs.length} 个，累计 ${allJobs.length} / ${total ?? '?'}`);

    if (jobs.length < ipp || allJobs.length >= total) break;

    page++;
    // 简单限流，避免对 paperball 接口造成过大压力
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`✅ API 爬取完成，共 ${allJobs.length} 个职位（total=${total ?? '?'}${sinceDateStr ? `，增量 cutoff=${sinceDateStr}` : ''}）`);
  return allJobs;
}

function transformJobData(job) {
  try {
    // 解析地点信息（新接口：cities 为对象数组，取 name 拼成 ";" 分隔串）
    let locations = '';
    if (Array.isArray(job.cities) && job.cities.length > 0) {
      locations = job.cities.map(c => (c && c.name) || '').filter(Boolean).join(';');
    } else if (job.city_name) {
      locations = job.city_name;
    }

    // 新接口 company 为嵌套对象 { name, company_intro, industry_types, scale, ... }
    const companyObj = (job.company && typeof job.company === 'object') ? job.company : {};
    const companyName = companyObj.name || (typeof job.company === 'string' ? job.company : '');

    return {
      announcementId: (typeof job.announcement_id === 'number') ? BigInt(job.announcement_id) : null,
      company: stringifyField(companyName),
      industry: getIndustryNames(job.industry_types),
      recruitType: getClassNames(job.class_types),
      locations: locations,
      startDate: stringifyField(job.published_at),
      endDate: job.expired_at == null ? null : stringifyField(job.expired_at),
      noWrittenTest: getWrittenTestName(job.written_test) === '无笔试' ? 'true' : 'false',
      roles: stringifyField(job.original_jobs, ';'),
      announcementLink: stringifyField(job.link),
      applyLink: stringifyField(job.from_url),
      remark: stringifyField(companyObj.company_intro),
      batch: '', // 新接口无 recruit_type，无法可靠推导秋招/春招/实习，留空（前端仅展示、不用于筛选）
      salary: null,
      createdAt: parseCreatedAt(job.created_at)
    };
  } catch (error) {
    console.error('❌ 职位数据转换失败:', error.message);
    return null;
  }
}

async function saveJobsToDB(jobs) {
  if (!jobs || jobs.length === 0) {
    console.log('📭 无新职位数据需要保存');
    return { inserted: 0, updated: 0 };
  }

  // 仅保留带 announcementId 的职位（新接口必有；缺则跳过，避免唯一键冲突）
  const valid = jobs.filter(j => j && j.announcementId != null);
  const skipped = jobs.length - valid.length;
  if (skipped > 0) {
    console.warn(`⚠️  跳过 ${skipped} 条缺少 announcementId 的职位`);
  }

  if (valid.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  // 按 Prisma 字段长度限制截断超长字符串，避免 createMany 报 P2000
  const sanitized = sanitizeJobsForDB(valid);

  console.log(`💾 正在按 announcementId 写入 ${sanitized.length} 个职位（新增/更新分离）...`);

  // 分页查询已存在的 announcementId，避免一次性 IN 几万条导致 Postgres 参数超限
  const CHUNK_SIZE = 500;
  const ids = sanitized.map(j => j.announcementId);
  const existingSet = new Set();
  for (const idChunk of chunkArray(ids, CHUNK_SIZE)) {
    const existingChunk = await prisma.job.findMany({
      where: { announcementId: { in: idChunk } },
      select: { announcementId: true }
    });
    for (const j of existingChunk) existingSet.add(j.announcementId);
  }

  const toCreate = sanitized.filter(j => !existingSet.has(j.announcementId));
  const toUpdate = sanitized.filter(j => existingSet.has(j.announcementId));

  let inserted = 0;
  let updated = 0;

  try {
    // 新增：分批批量插入（避免单条 SQL 参数过多）
    if (toCreate.length > 0) {
      let chunkIndex = 0;
      const chunks = chunkArray(toCreate, CHUNK_SIZE);
      for (const chunk of chunks) {
        chunkIndex++;
        const result = await prisma.job.createMany({
          data: chunk,
          skipDuplicates: true
        });
        inserted += result.count;
        console.log(`📦 新增 ${inserted}/${toCreate.length}（第 ${chunkIndex}/${chunks.length} 批）`);
      }
    }

    // 更新：逐条回写（保留 createdAt 首见时间，不覆盖 announcementId）
    for (const j of toUpdate) {
      const { announcementId, createdAt, ...fields } = j;
      await prisma.job.update({
        where: { announcementId },
        data: fields
      });
      updated++;
      if (updated % 20 === 0) await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (toUpdate.length > 0) {
      console.log(`🔄 更新 ${updated} 个已存在职位（截止日/状态等变更已同步）`);
    }

    console.log(`✅ 写入完成：新增 ${inserted}，更新 ${updated}`);
    return { inserted, updated };
  } catch (error) {
    console.error('❌ 保存职位数据到数据库失败:', error);
    throw error;
  }
}

async function sendNotification(jobsCount) {
  try {
    const { FEISHU_WEBHOOK_URL } = process.env;
    if (!FEISHU_WEBHOOK_URL) {
      console.log('🚫 未配置飞书 webhook，跳过通知');
      return;
    }

    const payload = {
      msg_type: "post",
      content: {
        zh_cn: {
          content: [
            [
              {
                tag: "text",
                text: `校招职位爬取任务完成！\n`
              },
              {
                tag: "text",
                text: `⏰ 完成时间：${new Date().toLocaleString('zh-CN')}\n`
              },
              {
                tag: "text",
                text: `📊 新增职位：${jobsCount} 个`
              }
            ]
          ]
        }
      }
    };

    await axios.post(FEISHU_WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    console.log('🔔 飞书通知发送成功');
  } catch (error) {
    console.error('❌ 飞书通知发送失败:', error.message);
  }
}

async function sendFailureAlert(detail) {
  try {
    const { FEISHU_WEBHOOK_URL } = process.env;
    if (!FEISHU_WEBHOOK_URL) {
      console.log('🚫 未配置飞书 webhook，跳过失败告警');
      return;
    }

    const payload = {
      msg_type: "text",
      content: {
        text: `⚠️ 校招职位爬取任务失败！\n⏰ 时间：${new Date().toLocaleString('zh-CN')}\n❌ 原因：${String(detail).slice(0, 200)}`
      }
    };

    await axios.post(FEISHU_WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    console.log('🔔 飞书失败告警已发送');
  } catch (e) {
    console.error('❌ 飞书失败告警发送失败:', e.message);
  }
}

async function main() {
  console.log('🚀 开始执行职位爬取任务...');

  try {
    // 模式决策：
    // - 表为空 / 显式 FULL_BACKFILL=1 → 全量抓取（一次性补齐历史）
    // - FROM_DATE 已设（GitHub Actions 手动指定）→ 按 from_date 增量（用于补历史断档）
    // - 否则 → 增量：仅抓"昨天至今"(上海时间，留 1 天边界余量)，避免每天重复全量拉取 2w+
    //   注：GitHub Actions 的 reset=true 会先清空 job 表，清空后 existing=0 自动走全量，无需额外传参。
    const forceFull = process.env.FULL_BACKFILL === '1';
    const fromDate = (process.env.FROM_DATE || '').trim();
    const existing = await prisma.job.count();
    let sinceDateStr = null;
    if (!forceFull && existing > 0) {
      if (fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
        sinceDateStr = fromDate;
        console.log(`🗓️  补数据模式：FROM_DATE=${sinceDateStr}（现有 ${existing} 条，按发布日期 >= ${sinceDateStr} 增量）`);
      } else {
        const yesterday = new Date(Date.now() - 86400000);
        sinceDateStr = getShanghaiDateStr(yesterday);
        console.log(`🗓️  增量模式：表已有 ${existing} 条，仅抓发布日期 >= ${sinceDateStr} 的新职位`);
      }
    } else {
      console.log(`📦 全量模式：表${existing > 0 ? '非空但强制' : '为空'}，抓取所有在招职位`);
    }

    // 步骤 1：从 API 爬取职位数据
    const rawJobs = await fetchJobsFromAPI(sinceDateStr);
    if (rawJobs.length === 0) {
      console.log('📭 未获取到新职位数据，任务结束');
      return;
    }

    // 步骤 2：数据转换
    console.log('🔄 正在转换职位数据...');
    const jobs = rawJobs.map(transformJobData).filter(job => job !== null);

    // 步骤 3：保存到数据库
    const { inserted, updated } = await saveJobsToDB(jobs);

    // 步骤 4：发送通知
    if (inserted > 0) {
      await sendNotification(inserted);
    } else {
      console.log('📭 无新增职位数据需要发送通知');
    }

    // 任务完成
    console.log('\n🎉 职位爬取任务完成！');
    console.log('📊 总爬取职位数：', jobs.length);
    console.log('🔄 有效职位数：', jobs.length);
    console.log('💾 新增职位数：', inserted);
    console.log('🔁 更新职位数：', updated);

  } catch (error) {
    console.error('❌ 爬取任务失败:', error);
    await sendFailureAlert(error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 仅当作为脚本直接运行时才启动（被 require 时可用于单元测试，不触发 main）
if (require.main === module) {
  main();
}

// 导出纯函数供单元测试（不影响脚本直接运行）
module.exports = {
  transformJobData,
  getIndustryNames,
  getClassNames,
  getWrittenTestName,
  getBatchName,
  parseCreatedAt,
};
