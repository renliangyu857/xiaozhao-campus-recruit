import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionUserId, setUserApiSecret } from "@/lib/session";
import { invalidateAuthCurrentCache } from "@/lib/cache";
import { logger } from "@/lib/logger";
import {
  exchangeCodeForToken,
  getWechatUserInfo,
  parseState,
  WECHAT_CONFIG,
  getWechatAccessToken,
  getUserSubscribeStatus,
} from "@/lib/wechat";
import {
  markTicketSuccess,
  markTicketScanned,
} from "@/lib/wechatTicket";

/**
 * GET /api/auth/wechat/callback
 * 微信 OAuth 回调处理
 *
 * 查询参数:
 * - code: 微信授权码
 * - state: 携带的 state 参数（包含 redirectPath 和 ticket）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateStr = searchParams.get("state");

  // 打印完整请求信息用于调试
  console.log("[WechatCallback] Received request:", {
    fullUrl: request.url,
    code: code ? "present" : "missing",
    state: stateStr,
    headers: {
      host: request.headers.get("host"),
      "user-agent": request.headers.get("user-agent")?.slice(0, 50),
    },
  });

  // 解析 state
  const state = stateStr ? parseState(stateStr) : null;
  const redirectPath = state?.redirectPath || "/";

  // 错误处理：用户拒绝授权
  if (!code) {
    logger.warn("wechat_callback_no_code", { state: stateStr });
    // 检查是否是微信返回的错误
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    console.error("[WechatCallback] WeChat returned error:", {
      error,
      errorDescription,
      allParams: Object.fromEntries(searchParams.entries()),
    });
    return NextResponse.redirect(
      new URL(`${redirectPath}?error=access_denied`, WECHAT_CONFIG.CALLBACK_URL)
        .href
    );
  }

  try {
    // 1. 用 code 换取 access_token 和 openid
    const tokenData = await exchangeCodeForToken(code);
    const { openid, access_token, scope, unionid } = tokenData;

    logger.info("wechat_token_exchanged", { openid, scope, hasUnionId: !!unionid });

    // 2. 如果有 ticket（PC 扫码登录），标记为已扫码
    if (state?.ticket) {
      await markTicketScanned(state.ticket, openid);
    }

    // 3. 获取用户信息（如果 scope 包含 snsapi_userinfo）
    let nickname: string | null = null;
    let avatar: string | null = null;

    if (scope.includes("snsapi_userinfo")) {
      try {
        const userInfo = await getWechatUserInfo(access_token, openid);
        nickname = userInfo.nickname;
        avatar = userInfo.headimgurl;
        logger.info("wechat_userinfo_fetched", { openid, nickname: nickname || "unnamed" });
      } catch (error) {
        // 获取用户信息失败，使用默认值继续
        logger.warn("wechat_userinfo_failed", { openid, error: String(error) });
      }
    }

    // 4. 查找或创建用户
    let user = await prisma.appUser.findUnique({
      where: { openId: openid },
    });
    let isNewUser = false;

    // 5. 检查用户是否已关注服务号
    let isSubscribed = user?.isSubscribed ?? false;

    // 如果是新用户，或者老用户但还未关注，检查关注状态
    if (!user || !user.isSubscribed) {
      try {
        // 获取微信公众号 access_token
        const mpAccessToken = await getWechatAccessToken();
        // 查询用户关注状态
        isSubscribed = await getUserSubscribeStatus(mpAccessToken, openid);
      } catch (error) {
        console.error("[WechatCallback] Failed to check subscribe status:", error);
        // 如果检查失败，默认允许登录（避免阻塞）
        isSubscribed = true;
      }
    }

    if (!user) {
      // 新用户：创建记录
      user = await prisma.appUser.create({
        data: {
          openId: openid,
          unionId: unionid || null,
          nickname: nickname || `微信用户_${openid.slice(-6)}`,
          avatar: avatar,
          queryCount: 0,
          isSubscribed,
          ...(isSubscribed && { subscribedAt: new Date() }),
        },
      });
      isNewUser = true;
      logger.info("auth_user_created", { userId: String(user.id), openid, isSubscribed });
    } else {
      // 老用户：更新信息和关注状态
      const updateData: { nickname?: string; avatar?: string; unionId?: string; isSubscribed?: boolean; subscribedAt?: Date } = {};
      if (nickname && !user.nickname) updateData.nickname = nickname;
      if (avatar && !user.avatar) updateData.avatar = avatar;
      if (unionid && !user.unionId) updateData.unionId = unionid;

      // 如果关注状态有变化，更新关注状态
      if (isSubscribed !== user.isSubscribed) {
        updateData.isSubscribed = isSubscribed;
        if (isSubscribed && !user.subscribedAt) {
          updateData.subscribedAt = new Date();
        }
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.appUser.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    // 6. 如果用户未关注服务号，跳转到关注提示页面
    if (!isSubscribed) {
      logger.info("auth_user_not_subscribed", { openid, ticket: state?.ticket });

      // 如果是 PC 扫码登录，保留 ticket 信息
      if (state?.ticket) {
        await markTicketScanned(state.ticket, openid);
        return NextResponse.redirect(
          new URL(
            `/auth/subscribe?ticket=${state.ticket}`,
            WECHAT_CONFIG.CALLBACK_URL
          ).href
        );
      }

      // H5 登录未关注，也跳转到关注页面
      return NextResponse.redirect(
        new URL(
          `/auth/subscribe`,
          WECHAT_CONFIG.CALLBACK_URL
        ).href
      );
    }

    // 7. 新用户赠送 2 天 VIP 体验
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
      logger.info("auth_trial_granted", {
        userId: String(user.id),
        endAt: trialEnd.toISOString(),
      });
    }

    // 8. 如果是 PC 扫码登录，标记票据成功并跳转成功页
    if (state?.ticket) {
      await markTicketSuccess(state.ticket, String(user.id));
      // PC 端扫码后，在手机上显示登录成功页面
      return NextResponse.redirect(
        new URL(
          `/auth/success?ticket=${state.ticket}&nickname=${encodeURIComponent(
            user.nickname || ""
          )}`,
          WECHAT_CONFIG.CALLBACK_URL
        ).href
      );
    }

    // 9. H5 登录：设置 session 并跳转回前端
    await setSessionUserId(Number(user.id));
    await setUserApiSecret(Number(user.id));
    await invalidateAuthCurrentCache(Number(user.id));

    logger.info("auth_login_success", {
      userId: String(user.id),
      isNewUser,
      mode: "h5",
      isSubscribed,
    });

    // 构建跳转 URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";
    const redirectUrl = new URL(redirectPath, appUrl);
    redirectUrl.searchParams.set("login", "success");

    return NextResponse.redirect(redirectUrl.href);
  } catch (error) {
    logger.error("wechat_callback_failed", {
      error: String(error),
      code,
      state: stateStr,
    });

    // 跳转到错误页面
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";
    const errorUrl = new URL(redirectPath, appUrl);
    errorUrl.searchParams.set("error", "login_failed");

    return NextResponse.redirect(errorUrl.href);
  }
}
