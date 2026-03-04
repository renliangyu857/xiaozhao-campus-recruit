import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseWechatXml,
} from "@/lib/wechat";
import { markTicketSuccess, markTicketScanned } from "@/lib/wechatTicket";
import { logger } from "@/lib/logger";

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

  // 这里应该进行签名验证，为简化先直接返回 echostr
  // 生产环境应该使用微信提供的验证算法
  console.log("[WechatMP] Verification request:", {
    signature,
    timestamp,
    nonce,
    echostr,
  });

  return new NextResponse(echostr);
}

/**
 * POST /api/wechat/mp-event
 * 接收微信公众号推送的消息和事件
 * 处理用户扫码关注事件，自动完成登录
 */
export async function POST(request: NextRequest) {
  try {
    const xml = await request.text();
    console.log("[WechatMP] Received event:", xml);

    const msg = parseWechatXml(xml);
    if (!msg) {
      return new NextResponse("success");
    }

    const { FromUserName: openid, Event, EventKey } = msg;

    // 处理关注事件（包括扫码关注）
    if (Event === "subscribe" || Event === "SCAN") {
      await handleUserSubscribe(openid, EventKey);
    }

    // 返回空响应（或欢迎消息）
    return new NextResponse("success");
  } catch (error) {
    console.error("[WechatMP] Error handling event:", error);
    return new NextResponse("success");
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

    // 查找或创建用户
    let user = await prisma.appUser.findUnique({
      where: { openId: openid },
    });

    let isNewUser = false;

    if (!user) {
      // 新用户：创建记录，昵称先用默认值，后续可以更新
      user = await prisma.appUser.create({
        data: {
          openId: openid,
          nickname: `微信用户_${openid.slice(-6)}`,
          queryCount: 0,
          isSubscribed: true,
          subscribedAt: new Date(),
        },
      });
      isNewUser = true;
      logger.info("mp_user_created", { userId: String(user.id), openid });
    } else {
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
    if (ticket && ticket.startsWith("ticket_")) {
      await markTicketScanned(ticket, openid);
      await markTicketSuccess(ticket, String(user.id));
      logger.info("mp_login_success", {
        userId: String(user.id),
        ticket,
        isNewUser,
      });
    }

    // 发送欢迎消息给用户
    // 注意：这里需要调用客服消息接口，被动回复只能立即回复，不能异步发送
  } catch (error) {
    console.error("[WechatMP] Error handling subscribe:", error);
    logger.error("mp_subscribe_error", { openid, error: String(error) });
  }
}
