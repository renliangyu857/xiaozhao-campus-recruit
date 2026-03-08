import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { getClientIp, rateLimitCheck } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

const VALID_PLANS = ["1_month", "3_month", "1_year"];
const ORDER_RATE_WINDOW = 60;
const ORDER_RATE_MAX = 10;

export async function POST(request: NextRequest) {
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

  // 查询用户当前有效会员（结束时间大于现在的）
  const currentMember = await prisma.userMember.findFirst({
    where: { userId, endAt: { gte: now } },
    orderBy: { endAt: "desc" },
  });

  // 计算新会员的开始时间：如果有有效会员，从那个结束时间开始；否则从现在开始
  const startAt = currentMember ? new Date(currentMember.endAt) : now;

  // 计算新的结束时间
  const endAt = new Date(startAt);
  if (planId === "1_month") {
    endAt.setMonth(endAt.getMonth() + 1);
  } else if (planId === "3_month") {
    endAt.setMonth(endAt.getMonth() + 3);
  } else {
    endAt.setFullYear(endAt.getFullYear() + 1);
  }

  // 创建新的会员记录
  await prisma.userMember.create({
    data: { userId, planId, startAt, endAt },
  });

  logger.info("vip_order_created", {
    userId: String(userId),
    planId,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    hasExistingMember: !!currentMember,
    existingEndAt: currentMember?.endAt.toISOString(),
  });
  return NextResponse.json({
    orderId: `order_${Date.now()}`,
    planId,
    amount: 0,
    message: "订单创建成功（模拟）",
  });
}
