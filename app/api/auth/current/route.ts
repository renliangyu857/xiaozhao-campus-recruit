import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { cacheGet, cacheSet, authCurrentCacheKey } from "@/lib/cache";
import { logger } from "@/lib/logger";

const MAX_FREE_QUERIES = parseInt(process.env.MAX_FREE_QUERIES ?? "3", 10);
const AUTH_CURRENT_TTL = 45;

export async function GET() {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }
  const cacheKey = authCurrentCacheKey(userId);
  const cached = await cacheGet<{
    id: string;
    nickname: string;
    avatar: string;
    isVip: boolean;
    isTrial: boolean;
    vipExpiry?: string;
    queryCount: number;
    remainingFreeQueries?: number;
  }>(cacheKey);
  if (cached) {
    logger.info("auth_current_cache_hit", { userId: String(userId), cacheKey, vipExpiry: cached.vipExpiry });
    return NextResponse.json(cached);
  }
  logger.info("auth_current_cache_miss", { userId: String(userId), cacheKey });
  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }
  const now = new Date();
  // 查询所有会员记录用于调试
  const allMembers = await prisma.userMember.findMany({
    where: { userId },
    orderBy: { endAt: "desc" },
  });
  logger.info("auth_current_all_members", { userId: String(userId), count: allMembers.length, members: allMembers.map(m => ({ id: String(m.id), planId: m.planId, startAt: m.startAt.toISOString(), endAt: m.endAt.toISOString() })) });

  const membership = await prisma.userMember.findFirst({
    where: { userId, startAt: { lte: now }, endAt: { gte: now } },
    orderBy: { endAt: "desc" },
  });
  const isVip = !!membership;
  logger.info("auth_current_membership", { userId: String(userId), isVip, membershipEndAt: membership?.endAt.toISOString() });
  const vipExpiry = membership ? membership.endAt.toISOString().slice(0, 10) : null;
  // 判断是否为试用会员：planId 为 trial 或价格小于等于 0
  const isTrial = membership ? (membership.planId === 'trial' || membership.planId === 'gift') : false;

  const today = new Date().toISOString().slice(0, 10);
  const resetAt = user.queryCountResetAt?.toISOString().slice(0, 10);
  const queryCount = resetAt === today ? user.queryCount : 0;
  const remainingFreeQueries = Math.max(0, MAX_FREE_QUERIES - queryCount);
  const payload = {
    id: String(user.id),
    nickname: user.nickname ?? "",
    avatar: user.avatar ?? "",
    isVip,
    isTrial,
    vipExpiry: vipExpiry ?? undefined,
    queryCount: user.queryCount,
    remainingFreeQueries: isVip ? undefined : remainingFreeQueries,
  };
  await cacheSet(cacheKey, payload, AUTH_CURRENT_TTL);
  return NextResponse.json(payload);
}
