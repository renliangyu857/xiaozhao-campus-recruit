import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionUserId } from "@/lib/session";
import { invalidateAuthCurrentCache } from "@/lib/cache";
import { getClientIp, rateLimitCheck } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

const LOGIN_RATE_WINDOW = 60;
const LOGIN_RATE_MAX = 20;

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimitCheck(`login:${ip}`, LOGIN_RATE_WINDOW, LOGIN_RATE_MAX);
  if (!rl.allowed) {
    logger.warn("auth_login_rate_limited", { ip });
    return NextResponse.json({ message: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code || !code.trim()) {
    return NextResponse.json({ message: "缺少 code" }, { status: 400 });
  }
  const openId = code.trim();
  if (openId.length > 128) {
    return NextResponse.json({ message: "参数无效" }, { status: 400 });
  }
  let user = await prisma.appUser.findUnique({ where: { openId } });
  let isNewUser = false;
  if (!user) {
    user = await prisma.appUser.create({
      data: {
        openId,
        nickname: `用户_${openId.slice(-6)}`,
        queryCount: 0,
      },
    });
    isNewUser = true;
    logger.info("auth_user_created", { userId: String(user.id) });
  }
  // 新用户自动获得2天VIP体验 (planId 使用 trial 标记)
  if (isNewUser) {
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + 2 * 24 * 60 * 60 * 1000);
    await prisma.userMember.create({
      data: {
        userId: Number(user.id),
        planId: "trial",
        startAt: trialStart,
        endAt: trialEnd,
      },
    });
    logger.info("auth_trial_granted", { userId: String(user.id), endAt: trialEnd.toISOString() });
  }
  await setSessionUserId(Number(user.id));
  await invalidateAuthCurrentCache(Number(user.id));
  const isVip = await checkIsVip(Number(user.id));
  const vipInfo = await getVipInfo(Number(user.id));
  logger.info("auth_login_success", { userId: String(user.id), isVip, isNewUser });
  return NextResponse.json({
    id: String(user.id),
    nickname: user.nickname ?? "",
    avatar: user.avatar ?? "",
    isVip,
    isTrial: vipInfo?.isTrial ?? false,
    vipExpiry: vipInfo?.expiry ?? undefined,
    queryCount: user.queryCount,
    remainingFreeQueries: undefined,
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

async function getVipInfo(userId: number): Promise<{ expiry: string; isTrial: boolean } | null> {
  const m = await prisma.userMember.findFirst({
    where: { userId, endAt: { gte: new Date() } },
    orderBy: { endAt: "desc" },
  });
  if (!m) return null;
  return {
    expiry: m.endAt.toISOString().slice(0, 10),
    isTrial: m.planId === "trial" || m.planId === "gift",
  };
}
