import { NextRequest, NextResponse } from "next/server";
import { createLoginTicket } from "@/lib/wechatTicket";
import {
  generateMpQrCode,
  getMpQrCodeImageUrl,
  validateWechatConfig,
} from "@/lib/wechat";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/qrcode
 * 生成 PC 端扫码登录的二维码数据
 * 使用微信公众号带参数二维码，用户扫码关注后自动完成登录
 *
 * 返回:
 * - ticket: 登录票据
 * - qrCodeUrl: 公众号带参数二维码图片 URL
 * - pollUrl: 轮询接口地址
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  logger.info("qrcode_login_requested", {});

  // 验证配置
  const configCheck = validateWechatConfig();
  if (!configCheck.valid) {
    logger.error("qrcode_login_config_invalid", {
      missing: configCheck.missing,
    });
    return NextResponse.json(
      {
        message: "微信登录配置未完成",
        details: `缺少配置项: ${configCheck.missing.join(", ")}`,
      },
      { status: 503 }
    );
  }

  try {
    // 创建登录票据
    const ticketData = await createLoginTicket();
    logger.info("qrcode_login_ticket_created", {
      ticket: ticketData.ticket,
    });

    // 生成带参数二维码（使用 ticket 作为场景值）
    // 用户扫码关注后，微信会推送事件到 /api/wechat/mp-event
    const mpQrCode = await generateMpQrCode(ticketData.ticket, 600);

    // 获取二维码图片 URL
    const qrCodeUrl = getMpQrCodeImageUrl(mpQrCode.ticket);

    logger.info("qrcode_login_created", {
      ticket: ticketData.ticket,
      mpTicket: mpQrCode.ticket,
      expiresIn: mpQrCode.expire_seconds,
    });

    return NextResponse.json({
      ticket: ticketData.ticket,
      qrCodeUrl, // 公众号带参数二维码图片 URL
      pollUrl: `/api/auth/qrcode/poll?ticket=${ticketData.ticket}`,
      // 二维码有效期（10分钟）
      expiresIn: mpQrCode.expire_seconds,
    });
  } catch (error) {
    logger.error("qrcode_login_failed", {
      error: String(error),
    });
    return NextResponse.json(
      { message: "生成登录二维码失败", error: String(error) },
      { status: 500 }
    );
  }
}
