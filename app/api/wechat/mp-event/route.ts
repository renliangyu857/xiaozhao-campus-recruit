import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { parseWechatXml, getWechatAccessToken } from "@/lib/wechat";
import { markTicketSuccess, markTicketScanned } from "@/lib/wechatTicket";
import { logger } from "@/lib/logger";

// 微信代理服务器配置
const WECHAT_PROXY_URL = process.env.WECHAT_PROXY_URL || "";
const WECHAT_PROXY_TOKEN = process.env.WECHAT_PROXY_TOKEN || "";

// 微信公众号配置
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || "";
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

// 从环境变量读取微信服务器配置 Token
const WECHAT_MP_TOKEN = process.env.WECHAT_MP_TOKEN || "";

/**
 * 获取微信用户信息（通过代理或直接调用）
 */
async function fetchWechatUserInfo(openid: string): Promise<{ nickname?: string; headimgurl?: string } | null> {
  try {
    // 如果配置了代理，使用代理获取用户信息
    if (WECHAT_PROXY_URL && WECHAT_PROXY_TOKEN) {
      const userRes = await fetch(`${WECHAT_PROXY_URL}/wechat/userinfo?openid=${openid}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${WECHAT_PROXY_TOKEN}` },
      });
      const userData = await userRes.json();
      if (userData.error || !userRes.ok) {
        console.error("[WechatMP] Failed to get user info from proxy:", userData);
        return null;
      }
      return {
        nickname: userData.nickname,
        headimgurl: userData.headimgurl,
      };
    }

    // 直接调用微信接口（需要 IP 白名单）
    const accessToken = await getWechatAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.errcode) {
      console.error("[WechatMP] Failed to get user info:", data);
      return null;
    }

    return {
      nickname: data.nickname,
      headimgurl: data.headimgurl,
    };
  } catch (error) {
    console.error("[WechatMP] Error fetching user info:", error);
    return null;
  }
}

/**
 * 验证微信服务器签名
 * 算法：将 token、timestamp、nonce 按字典序排序后拼接，进行 sha1 加密，与 signature 对比
 */
function verifyWechatSignature(
  signature: string,
  timestamp: string,
  nonce: string
): boolean {
  if (!WECHAT_MP_TOKEN) {
    console.error("[WechatMP] WECHAT_MP_TOKEN not configured");
    return false;
  }

  // 1. 将 token、timestamp、nonce 按字典序排序
  const sorted = [WECHAT_MP_TOKEN, timestamp, nonce].sort();
  // 2. 拼接成字符串
  const str = sorted.join("");
  // 3. sha1 加密
  const hash = createHash("sha1").update(str).digest("hex");
  // 4. 对比 signature
  return hash === signature;
}

/**
 * GET /api/wechat/mp-event
 * 微信公众号服务器配置验证
 * 微信服务器配置时需要调用此接口验证 URL 有效性
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const signature = searchParams.get("signature") || "";
  const timestamp = searchParams.get("timestamp") || "";
  const nonce = searchParams.get("nonce") || "";
  const echostr = searchParams.get("echostr") || "";

  console.log("[WechatMP] Verification request:", {
    signature,
    timestamp,
    nonce,
    echostr,
    tokenConfigured: !!WECHAT_MP_TOKEN,
  });

  // 验证签名
  if (!verifyWechatSignature(signature, timestamp, nonce)) {
    console.error("[WechatMP] Signature verification failed");
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 签名验证通过，返回 echostr
  console.log("[WechatMP] Signature verified, returning echostr");
  return new NextResponse(echostr);
}

/**
 * POST /api/wechat/mp-event
 * 接收微信公众号推送的消息和事件
 * 处理用户扫码关注事件，自动完成登录
 */
export async function POST(request: NextRequest) {
  try {
    // 验证签名
    const { searchParams } = new URL(request.url);
    const signature = searchParams.get("signature") || "";
    const timestamp = searchParams.get("timestamp") || "";
    const nonce = searchParams.get("nonce") || "";

    if (!verifyWechatSignature(signature, timestamp, nonce)) {
      console.error("[WechatMP] POST signature verification failed");
      return new NextResponse("Forbidden", { status: 403 });
    }

    const xml = await request.text();
    console.log("[WechatMP] Received event:", xml);

    const msg = parseWechatXml(xml);
    if (!msg) {
      return new NextResponse("success");
    }

    const { FromUserName: openid, Event, EventKey } = msg;

    // 处理关注事件（包括扫码关注）
    console.log("[WechatMP] Processing event:", { Event, EventKey, openid });
    if (Event === "subscribe" || Event === "SCAN") {
      console.log("[WechatMP] Handling subscribe/SCAN event");
      await handleUserSubscribe(openid, EventKey);
    } else {
      console.log("[WechatMP] Unhandled event type:", Event);
    }

    // 返回空响应（或欢迎消息）
    return new NextResponse("success");
  } catch (error) {
    console.error("[WechatMP] Error handling event:", error);
    return new NextResponse("success");
  }
}

/**
 * 发送授权链接消息给用户
 * 当公众号接口无法获取用户昵称/头像时，引导用户通过 OAuth 授权
 */
async function sendAuthLinkMessage(openid: string, ticket: string) {
  try {
    // 构建授权 URL（使用 snsapi_userinfo 获取完整用户信息）
    const authUrl = `${NEXT_PUBLIC_APP_URL}/api/auth/wechat/authorize?ticket=${ticket}`;

    // 获取 access_token
    let accessToken: string;
    if (WECHAT_PROXY_URL && WECHAT_PROXY_TOKEN) {
      const tokenRes = await fetch(`${WECHAT_PROXY_URL}/wechat/token`, {
        headers: { "Authorization": `Bearer ${WECHAT_PROXY_TOKEN}` },
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) {
        console.error("[WechatMP] Failed to get token from proxy:", tokenData);
        return;
      }
      accessToken = tokenData.access_token;
    } else {
      accessToken = await getWechatAccessToken();
    }

    // 发送客服消息
    const url = `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        touser: openid,
        msgtype: "text",
        text: {
          content: `欢迎登录！为了获取更好的体验，请点击链接完成授权：\n<a href=\"${authUrl}\">点击授权获取头像昵称</a>`,
        },
      }),
    });

    const data = await res.json();
    if (data.errcode) {
      console.error("[WechatMP] Failed to send auth link:", data);
    } else {
      console.log("[WechatMP] Auth link sent to user:", { openid });
    }
  } catch (error) {
    console.error("[WechatMP] Error sending auth link:", error);
  }
}

/**
 * 处理用户关注/扫码事件，自动完成登录
 */
async function handleUserSubscribe(
  openid: string,
  eventKey: string | undefined
) {
  try {
    // 从 EventKey 中提取 ticket
    // subscribe 事件: EventKey = "qrscene_ticket_xxx"
    // SCAN 事件: EventKey = "ticket_xxx"
    let ticket: string | null = null;

    if (eventKey) {
      if (eventKey.startsWith("qrscene_")) {
        ticket = eventKey.replace("qrscene_", "");
      } else {
        ticket = eventKey;
      }
    }

    console.log("[WechatMP] User subscribed:", {
      openid,
      ticket,
      eventKey,
    });

    // 获取微信用户信息（昵称、头像）
    const wxUserInfo = await fetchWechatUserInfo(openid);
    console.log("[WechatMP] Fetched user info:", { openid, hasNickname: !!wxUserInfo?.nickname });

    // 查找或创建用户
    let user = await prisma.appUser.findUnique({
      where: { openId: openid },
    });

    let isNewUser = false;

    if (!user) {
      // 新用户：创建记录，使用微信昵称或默认值
      const nickname = wxUserInfo?.nickname || `微信用户_${openid.slice(-6)}`;
      const avatar = wxUserInfo?.headimgurl || null;
      user = await prisma.appUser.create({
        data: {
          openId: openid,
          nickname,
          avatar,
          queryCount: 0,
          isSubscribed: true,
          subscribedAt: new Date(),
        },
      });
      isNewUser = true;
      logger.info("mp_user_created", { userId: String(user.id), openid, nickname });
    } else {
      // 老用户：更新昵称和头像（如果之前没有）
      if ((!user.nickname || user.nickname.startsWith("微信用户_")) && wxUserInfo?.nickname) {
        await prisma.appUser.update({
          where: { id: user.id },
          data: {
            nickname: wxUserInfo.nickname,
            ...(wxUserInfo.headimgurl && { avatar: wxUserInfo.headimgurl }),
          },
        });
        console.log("[WechatMP] Updated user info:", { userId: user.id, nickname: wxUserInfo.nickname });
      }
      // 老用户：更新关注状态
      if (!user.isSubscribed) {
        await prisma.appUser.update({
          where: { id: user.id },
          data: {
            isSubscribed: true,
            subscribedAt: new Date(),
          },
        });
      }
    }

    // 新用户赠送 2 天 VIP 体验
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
      logger.info("mp_trial_granted", {
        userId: String(user.id),
        endAt: trialEnd.toISOString(),
      });
    }

    // 如果有 ticket（PC 端扫码登录），标记登录成功
    if (ticket && ticket.startsWith("wlt_")) {
      console.log("[WechatMP] Marking ticket as success:", { ticket, userId: user.id });
      await markTicketScanned(ticket, openid);
      const success = await markTicketSuccess(ticket, String(user.id));
      console.log("[WechatMP] Ticket marked:", { ticket, success });
      logger.info("mp_login_success", {
        userId: String(user.id),
        ticket,
        isNewUser,
      });

      // 如果没有获取到用户昵称/头像，发送授权链接让用户授权
      if (!wxUserInfo?.nickname || !wxUserInfo?.headimgurl) {
        await sendAuthLinkMessage(openid, ticket);
      }
    } else {
      console.log("[WechatMP] No valid ticket found:", { ticket, eventKey });
    }

    // 发送欢迎消息给用户
    // 注意：这里需要调用客服消息接口，被动回复只能立即回复，不能异步发送
  } catch (error) {
    console.error("[WechatMP] Error handling subscribe:", error);
    logger.error("mp_subscribe_error", { openid, error: String(error) });
  }
}
