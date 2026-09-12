#!/usr/bin/env node
/**
 * 一次性迁移脚本：将历史已付费用户（VIP 会员 / 网盘资料单独购买者）
 * 自动转为「19.9 永久会员」（planId=lifetime, endAt=2099-12-31）。
 *
 * 安全设计：
 *  - 默认 dry-run，只统计 + 打印，不写库。
 *  - 必须显式传 --apply 才会真正写入。
 *  - 运行前会打印目标 DATABASE_URL（脱敏），确认无误再继续。
 *
 * 判定「已付费用户」：
 *  - user_member 表中存在任意记录的用户（会员记录只在支付成功后写入），或
 *  - pan_material_purchase 表中 pay_status='paid' 的用户。
 *
 * 用法：
 *  node scripts/upgrade-legacy-members.js                # 仅预览
 *  node scripts/upgrade-legacy-members.js --apply        # 真正写入
 *  node scripts/upgrade-legacy-members.js --active-only  # 仅转当前仍在有效期内的会员
 */

const path = require("path");
const rootDir = path.resolve(__dirname, "..");
// 按约定优先 .env.local，再补 .env（均不覆盖已存在的环境变量）
require("dotenv").config({ path: path.join(rootDir, ".env.local") });
require("dotenv").config({ path: path.join(rootDir, ".env") });

const { PrismaClient } = require("@prisma/client");

const APPLY = process.argv.includes("--apply");
const ACTIVE_ONLY = process.argv.includes("--active-only");

const LIFETIME_END_AT = new Date("2099-12-31T23:59:59.000Z");

function maskUrl(u) {
  if (!u) return "(empty)";
  try {
    const url = new URL(u);
    const pwd = url.password ? "***" : "";
    return `${url.protocol}//${url.username ? url.username + ":" : ""}${pwd}@${url.host}${url.pathname}`;
  } catch {
    return u.replace(/\/\/.*@/, "//***@");
  }
}

const prisma = new PrismaClient();

async function main() {
  console.log("========================================");
  console.log(" 历史已付费用户 -> 永久会员 迁移脚本");
  console.log("========================================");
  console.log("目标数据库:", maskUrl(process.env.DATABASE_URL));
  console.log("模式:", APPLY ? "✅ 真实写入 (--apply)" : "🔍 仅预览 (dry-run，加 --apply 真正写入)");
  if (ACTIVE_ONLY) console.log("范围: 仅当前仍在有效期内的会员 (--active-only)");
  console.log("----------------------------------------");

  const now = new Date();

  // 1) 收集候选用户
  // 1a) 所有曾付费的会员用户
  const memberUsers = await prisma.userMember.findMany({
    where: ACTIVE_ONLY ? { endAt: { gte: now } } : {},
    select: { userId: true, planId: true, startAt: true, endAt: true },
  });
  const memberUserIds = new Set(memberUsers.map((m) => m.userId.toString()));

  // 1b) 网盘资料单独购买且已支付
  const panPaid = await prisma.panMaterialPurchase.findMany({
    where: { payStatus: "paid" },
    select: { userId: true },
  });
  for (const p of panPaid) memberUserIds.add(p.userId.toString());

  console.log(`候选用户数: ${memberUserIds.size}`);
  console.log(`  - 含会员记录: ${memberUsers.length}`);
  console.log(`  - 含已付费资料: ${panPaid.length}`);

  // 2) 逐个处理
  const planId = "lifetime";
  let toCreate = 0;
  let toUpdate = 0;
  let alreadyLifetime = 0;
  let errors = 0;

  for (const uidStr of memberUserIds) {
    const userId = BigInt(uidStr);
    try {
      const existingLifetime = await prisma.userMember.findFirst({
        where: { userId, planId },
      });

      if (existingLifetime) {
        if (existingLifetime.endAt.getTime() !== LIFETIME_END_AT.getTime()) {
          if (APPLY) {
            await prisma.userMember.update({
              where: { id: existingLifetime.id },
              data: { endAt: LIFETIME_END_AT },
            });
          }
          toUpdate++;
        } else {
          alreadyLifetime++;
        }
        continue;
      }

      // 取该用户最早的会员起始时间作为 lifetime 的 startAt（保持权益连续性）
      const userMembers = memberUsers.filter((m) => m.userId.toString() === uidStr);
      const earliestStart = userMembers.length
        ? userMembers.reduce((min, m) => (m.startAt < min ? m.startAt : min), userMembers[0].startAt)
        : now;

      if (APPLY) {
        await prisma.userMember.create({
          data: { userId, planId, startAt: earliestStart, endAt: LIFETIME_END_AT },
        });
      }
      toCreate++;
    } catch (e) {
      errors++;
      console.error(`  ⚠️ 用户 ${uidStr} 处理失败:`, e.message);
    }
  }

  console.log("----------------------------------------");
  console.log("结果汇总:");
  console.log(`  新建 lifetime 记录: ${toCreate}`);
  console.log(`  更新到期时间:       ${toUpdate}`);
  console.log(`  已是 lifetime:      ${alreadyLifetime}`);
  console.log(`  失败:               ${errors}`);
  console.log("----------------------------------------");
  if (!APPLY) {
    console.log("⚠️ 以上为预览结果，未做任何写入。确认无误后加 --apply 执行。");
  } else {
    console.log("✅ 写入完成。");
  }
}

main()
  .catch((e) => {
    console.error("❌ 迁移失败:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
