import { NextRequest, NextResponse } from "next/server";
import { createLoginTicket } from "@/lib/wechatTicket";
import { generateAuthUrl, validateWechatConfig } from "@/lib/wechat";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/qrcode
 * 生成 PC 端扫码登录的二维码数据
 *
 * 返回:
 * - ticket: 登录票据
 * - authUrl: 微信授权 URL（用于生成二维码）
 * - pollUrl: 轮询接口地址
 */
export async function GET(request: NextRequest) {
  // 验证配置
  const configCheck = validateWechatConfig();
  if (!configCheck.valid) {
    return NextResponse.json(
      {
        message: "微信登录配置未完成",
        details: `缺少配置项: ${configCheck.missing.join(", ")}`,
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const redirectPath = searchParams.get("redirectPath") || "/";

  try {
    // 创建登录票据
    const ticketData = await createLoginTicket();

    // 生成授权 URL（包含 ticket）
    const authUrl = generateAuthUrl({ redirectPath, ticket: ticketData.ticket });

    logger.info("qrcode_login_created", { ticket: ticketData.ticket });

    return NextResponse.json({
      ticket: ticketData.ticket,
      authUrl,
      pollUrl: `/api/auth/qrcode/poll?ticket=${ticketData.ticket}`,
      // 二维码有效期（10分钟）
      expiresIn: 600,
    });
  } catch (error) {
    logger.error("qrcode_login_failed", { error: String(error) });
    return NextResponse.json(
      { message: "生成登录二维码失败" },
      { status: 500 }
    );
  }
}
