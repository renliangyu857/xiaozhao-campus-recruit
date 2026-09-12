import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { getClientIp, rateLimitCheck } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { invalidateAuthCurrentCache, authCurrentCacheKey } from "@/lib/cache";
import { getRedis } from "@/lib/redis";
import { calculateVipValidity } from "@/lib/payment-config";

// 兼容旧 e2e 用例（它们仍传 1_month / 1_year），统一按 lifetime 处理
const VALID_PLANS = ["1_month", "3_month", "1_year", "lifetime"];
const ORDER_RATE_WINDOW = 60;
const ORDER_RATE_MAX = 10;

export async function POST(request: NextRequest) {
  // 安全：免费开通接口仅允许非生产环境（本地 e2e / 预览）。
  // 生产环境一律关闭，避免被任意登录用户白嫖会员。
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "该接口在生产环境不可用" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rl = await rateLimitCheck(`order:${ip}`, ORDER_RATE_WINDOW, ORDER_RATE_MAX);
  if (!rl.allowed) {
    logger.warn("vip_order_rate_limited", { ip });
    return NextResponse.json({ message: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }
  let body: { planId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "套餐无效或用户不存在" }, { status: 400 });
  }
  const planId = body?.planId;
  if (!planId || !VALID_PLANS.includes(planId)) {
    return NextResponse.json({ message: "套餐无效或用户不存在" }, { status: 400 });
  }

  const now = new Date();
  const currentMember = await prisma.userMember.findFirst({
    where: { userId, endAt: { gte: now } },
    orderBy: { endAt: "desc" },
  });

  // 统一转为「永久会员」：startAt 接续现有会员，endAt 固定 2099-12-31
  const validity = calculateVipValidity("lifetime", currentMember?.endAt);
  const startAt = validity.startAt;
  const endAt = validity.endAt;

  await prisma.userMember.create({
    data: { userId, planId: "lifetime", startAt, endAt },
  });

  await invalidateAuthCurrentCache(userId);

  const redis = getRedis();
  const cacheKey = authCurrentCacheKey(userId);
  if (redis) {
    try {
      await redis.del(cacheKey);
      logger.info("vip_order_cache_cleared", { userId: String(userId), cacheKey });
    } catch (e) {
      logger.warn("vip_order_cache_clear_failed", { userId: String(userId), error: String(e) });
    }
  }

  logger.info("vip_order_created", {
    userId: String(userId),
    planId: "lifetime",
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    hasExistingMember: !!currentMember,
  });

  return NextResponse.json({
    orderId: `order_${Date.now()}`,
    planId: "lifetime",
    amount: 0,
    message: "订单创建成功（模拟）",
    refreshUser: true,
    newVipExpiry: endAt.toISOString().slice(0, 10),
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
  });
}
