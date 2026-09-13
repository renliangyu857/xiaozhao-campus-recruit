import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionUserId } from "@/lib/session";
import { invalidateAuthCurrentCache } from "@/lib/cache";
import { consumeLoginCode } from "@/lib/loginCode";
import { getClientIp, rateLimitCheck } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

// 验证码爆破防护：单 IP 5 分钟内最多 10 次尝试（6 位码 + 一次性 + 5 分钟 TTL，双保险）
const ATTEMPT_WINDOW = 300;
const ATTEMPT_MAX = 10;

/**
 * POST /api/auth/code/login
 * 公众号验证码登录：{ code: "123456" } → 校验验证码 → openid → 查找/创建用户 → 种 session
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimitCheck(`codelogin:${ip}`, ATTEMPT_WINDOW, ATTEMPT_MAX);
  if (!rl.allowed) {
    logger.warn("auth_code_login_rate_limited", { ip });
    return NextResponse.json({ message: "尝试次数过多，请稍后再试" }, { status: 429 });
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "请求格式错误" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ message: "请输入 6 位数字验证码" }, { status: 400 });
  }

  const openid = await consumeLoginCode(code);
  if (!openid) {
    return NextResponse.json(
      { message: "验证码无效或已过期，请在公众号重新发送「登录」获取" },
      { status: 401 }
    );
  }

  let user = await prisma.appUser.findUnique({ where: { openId: openid } });
  let isNewUser = false;
  if (!user) {
    // 正常情况下用户已随「关注事件」创建；此处兜底
    user = await prisma.appUser.create({
      data: {
        openId: openid,
        nickname: `微信用户_${openid.slice(-6)}`,
        queryCount: 0,
      },
    });
    isNewUser = true;
    logger.info("auth_code_user_created", { userId: String(user.id) });
  }

  // 新用户赠送 2 天 VIP 体验（与关注事件、旧登录链路保持一致）
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
    logger.info("auth_code_trial_granted", { userId: String(user.id), endAt: trialEnd.toISOString() });
  }

  await setSessionUserId(Number(user.id));
  await invalidateAuthCurrentCache(Number(user.id));
  logger.info("auth_code_login_success", { userId: String(user.id), isNewUser });

  return NextResponse.json({
    id: String(user.id),
    nickname: user.nickname ?? "",
    avatar: user.avatar ?? "",
  });
}
