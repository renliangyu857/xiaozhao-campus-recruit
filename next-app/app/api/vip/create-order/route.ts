import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { getClientIp, rateLimitCheck } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

const VALID_PLANS = ["1_month", "3_month", "lifetime"];
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
  let endAt: Date;
  if (planId === "1_month") {
    endAt = new Date(now); endAt.setMonth(endAt.getMonth() + 1);
  } else if (planId === "3_month") {
    endAt = new Date(now); endAt.setMonth(endAt.getMonth() + 3);
  } else {
    endAt = new Date(now); endAt.setFullYear(endAt.getFullYear() + 99);
  }
  await prisma.userMember.create({
    data: { userId, planId, startAt: now, endAt },
  });
  logger.info("vip_order_created", { userId: String(userId), planId });
  return NextResponse.json({
    orderId: `order_${Date.now()}`,
    planId,
    amount: 0,
    message: "订单创建成功（模拟）",
  });
}
