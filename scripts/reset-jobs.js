#!/usr/bin/env node
/**
 * 一次性清空 job 表（迁移到 announcementId 唯一键后，清理 2026-03 冻结的历史脏数据）。
 * 仅删除职位数据，不影响其他表。需要 DATABASE_URL 环境变量（GitHub Actions Secrets 已注入）。
 * 用法：node scripts/reset-jobs.js   （CI 中由 workflow_dispatch 的 reset=true 触发）
 */

const path = require('path');
const rootDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(rootDir, '.env.local') });
const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ 未检测到 DATABASE_URL 环境变量，无法连接数据库。请在 GitHub Secrets / .env.local 中配置。');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 准备清空 job 表（历史冻结数据）...');
  const deleted = await prisma.job.deleteMany({});
  console.log(`✅ 已删除 ${deleted.count} 条旧职位数据。下一次爬虫运行将按 announcementId 重新抓取，数据彻底干净。`);
}

main()
  .catch((e) => {
    console.error('❌ 清空 job 表失败:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
