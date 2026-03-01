import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { getClientIp, rateLimitCheck } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

const MAX_FREE_QUERIES = parseInt(process.env.MAX_FREE_QUERIES ?? "3", 10);
const CONSUME_RATE_WINDOW = 60;
const CONSUME_RATE_MAX = 30;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimitCheck(`consume:${ip}`, CONSUME_RATE_WINDOW, CONSUME_RATE_MAX);
  if (!rl.allowed) {
    logger.warn("query_consume_rate_limited", { ip });
    return NextResponse.json({ message: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }
  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const resetAt = user.queryCountResetAt?.toISOString().slice(0, 10);
  let queryCount = user.queryCount;
  if (resetAt !== today) {
    queryCount = 0;
    await prisma.appUser.update({
      where: { id: userId },
      data: { queryCount: 0, queryCountResetAt: new Date() },
    });
  }
  const remainingFreeQueries = Math.max(0, MAX_FREE_QUERIES - queryCount);
  if (remainingFreeQueries <= 0) {
    const isVip = await checkIsVip(userId);
    if (!isVip) {
      return NextResponse.json(
        { message: "今日免费次数已用完，请开通会员", remainingFreeQueries: 0 },
        { status: 403 }
      );
    }
  }
  await prisma.appUser.update({
    where: { id: userId },
    data: { queryCount: queryCount + 1 },
  });
  logger.info("query_consume_success", { userId: String(userId), queryCount: queryCount + 1 });
  return NextResponse.json({
    allowed: true,
    remainingFreeQueries: Math.max(0, remainingFreeQueries - 1),
    queryCount: queryCount + 1,
    maxFreeQueries: MAX_FREE_QUERIES,
  });
}

async function checkIsVip(userId: number): Promise<boolean> {
  const now = new Date();
  const m = await prisma.userMember.findFirst({
    where: { userId, startAt: { lte: now }, endAt: { gte: now } },
    orderBy: { endAt: "desc" },
  });
  return !!m;
}
