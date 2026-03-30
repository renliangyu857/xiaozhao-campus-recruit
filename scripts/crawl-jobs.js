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
const API_URL = "https://apiv2.paperball-edu.com/aicv/announcements/new_v3";
const HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Content-Type': 'application/json',
  'Cookie': "UM_distinctid=19cb90e190e581-038b2601cf1d57-26061c51-151800-19cb90e190f530; auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzQ5NDUxMzYsInVzZXJfaWQiOjM1NjkyN30.5WGNOALcSNdbSZs17GXWOqovJ4VrWUorICJWu3-Kt74; refresh_token=e6d437b7c61b181294f54165525957ba2c0743d546453e5b59e370a9472c3aab.1776932336",
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

async function fetchJobsFromAPI() {
  console.log('📡 正在从 paperball-edu API 爬取职位数据...');

  try {
    const payload = {
      query: "",
      industry_type: 0,
      recruit_type: 0,
      scale_type: 0,
      class_type: 0,
      city_id: 0,
      page: 1,
      page_size: 100
    };

    const response = await axios.post(API_URL, payload, {
      headers: HEADERS,
      timeout: 60000
    });

    if (response.status !== 200 || !response.data) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = response.data;
    if (data.code !== 0 || !data.data?.items) {
      throw new Error(`API 返回错误: ${data.message || '未知错误'}`);
    }

    const jobs = data.data.items;
    console.log(`✅ API 爬取成功，获取到 ${jobs.length} 个职位`);
    return jobs;
  } catch (error) {
    console.error('❌ API 爬取失败:', error.message);
    return [];
  }
}

function transformJobData(job) {
  try {
    // 解析地点信息
    let locations = '';
    if (job.city_list && Array.isArray(job.city_list) && job.city_list.length > 0) {
      locations = job.city_list.join(';');
    } else if (job.city_name) {
      locations = job.city_name;
    }

    return {
      company: job.company_name || '',
      industry: getIndustryNames(job.industry_type),
      recruitType: getClassNames(job.class_type),
      locations: locations,
      startDate: job.publish_time || '',
      endDate: job.deadline || '',
      noWrittenTest: getWrittenTestName(job.written_test) === '无笔试' ? 'true' : 'false',
      roles: job.recruit_posts || '',
      announcementLink: job.announcement_link || '',
      applyLink: job.apply_link || '',
      remark: job.company_intro || '',
      batch: getBatchName(job.recruit_type),
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
    return 0;
  }

  console.log(`💾 正在保存 ${jobs.length} 个职位到数据库...`);

  let insertedCount = 0;
  const BATCH_SIZE = 50;

  try {
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE).filter(job => job !== null);

      // 检查批次中是否有已存在的职位
      const existingJobs = await prisma.job.findMany({
        where: {
          OR: batch.map(job => ({
            company: job.company,
            announcementLink: job.announcementLink
          }))
        },
        select: { id: true, company: true, announcementLink: true }
      });

      const existingJobSet = new Set(existingJobs.map(job =>
        `${job.company}_${job.announcementLink}`
      ));

      // 过滤掉已存在的职位
      const newJobs = batch.filter(job => {
        const key = `${job.company}_${job.announcementLink}`;
        return !existingJobSet.has(key);
      });

      if (newJobs.length > 0) {
        console.log(`📦 批次 ${Math.floor(i / BATCH_SIZE) + 1} - 新职位: ${newJobs.length} 个`);

        try {
          // 批量插入
          const result = await prisma.job.createMany({
            data: newJobs,
            skipDuplicates: true
          });
          insertedCount += result.count;
        } catch (batchError) {
          console.warn('⚠️  批量插入失败，尝试单条插入:', batchError.message);

          // 单条回退
          for (const job of newJobs) {
            try {
              await prisma.job.create({ data: job });
              insertedCount++;
            } catch (singleError) {
              console.warn('⚠️  单条插入失败:', singleError.message);
            }
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      } else {
        console.log(`📦 批次 ${Math.floor(i / BATCH_SIZE) + 1} - 无新职位`);
      }

      if (i + BATCH_SIZE < jobs.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ 保存完成，共新增 ${insertedCount} 个职位`);
    return insertedCount;
  } catch (error) {
    console.error('❌ 保存职位数据到数据库失败:', error);
    return 0;
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

async function main() {
  console.log('🚀 开始执行职位爬取任务...');

  try {
    // 步骤 1：从 API 爬取职位数据
    const rawJobs = await fetchJobsFromAPI();
    if (rawJobs.length === 0) {
      console.log('📭 未获取到新职位数据，任务结束');
      await prisma.$disconnect();
      return;
    }

    // 步骤 2：数据转换
    console.log('🔄 正在转换职位数据...');
    const jobs = rawJobs.map(transformJobData).filter(job => job !== null);

    // 步骤 3：保存到数据库
    const jobsCount = await saveJobsToDB(jobs);

    // 步骤 4：发送通知
    if (jobsCount > 0) {
      await sendNotification(jobsCount);
    } else {
      console.log('📭 无新职位数据需要发送通知');
    }

    // 任务完成
    console.log('\n🎉 职位爬取任务完成！');
    console.log('📊 总爬取职位数：', jobs.length);
    console.log('🔄 有效职位数：', jobs.length);
    console.log('💾 新增职位数：', jobsCount);

  } catch (error) {
    console.error('❌ 爬取任务失败:', error);
    await sendNotification(0);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
