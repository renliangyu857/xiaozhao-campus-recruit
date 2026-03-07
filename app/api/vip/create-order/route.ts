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
  // 查询用户当前有效会员，用于计算顺延时间
  const currentMember = await prisma.userMember.findFirst({
    where: { userId, endAt: { gte: new Date() } },
    orderBy: { endAt: "desc" },
  });

  // 从当前会员结束时间或现在时间开始计算新会员有效期
  const startAt = currentMember ? currentMember.endAt : new Date();
  let endAt: Date;
  if (planId === "1_month") {
    endAt = new Date(startAt); endAt.setMonth(endAt.getMonth() + 1);
  } else if (planId === "3_month") {
    endAt = new Date(startAt); endAt.setMonth(endAt.getMonth() + 3);
  } else {
    endAt = new Date(startAt); endAt.setFullYear(endAt.getFullYear() + 1);
  }
  await prisma.userMember.create({
    data: { userId, planId, startAt, endAt },
  });
  logger.info("vip_order_created", { userId: String(userId), planId });
  return NextResponse.json({
    orderId: `order_${Date.now()}`,
    planId,
    amount: 0,
    message: "订单创建成功（模拟）",
  });
}
