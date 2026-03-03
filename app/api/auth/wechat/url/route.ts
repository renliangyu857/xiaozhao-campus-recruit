import { NextRequest, NextResponse } from "next/server";
import {
  generateAuthUrl,
  validateWechatConfig,
  isWechatBrowser,
} from "@/lib/wechat";
import { createLoginTicket } from "@/lib/wechatTicket";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/wechat/url
 * 生成微信授权 URL
 *
 * 查询参数:
 * - redirectPath: 登录成功后跳转的路径（默认 "/"）
 * - mode: 登录模式，"h5" | "qrcode"（默认根据 User-Agent 自动判断）
 */
export async function GET(request: NextRequest) {
  // 验证配置
  const configCheck = validateWechatConfig();
  if (!configCheck.valid) {
    logger.error("wechat_config_missing", { missing: configCheck.missing });
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
  const mode = searchParams.get("mode") as "h5" | "qrcode" | null;

  // 判断登录模式
  const userAgent = request.headers.get("user-agent") || "";
  const isWechat = isWechatBrowser(userAgent);
  const loginMode = mode || (isWechat ? "h5" : "qrcode");

  try {
    // PC 端扫码登录需要创建票据
    let ticket: string | undefined;
    if (loginMode === "qrcode") {
      const ticketData = await createLoginTicket();
      ticket = ticketData.ticket;
    }

    // 生成授权 URL
    const authUrl = generateAuthUrl({ redirectPath, ticket });

    console.log("[WechatUrl] Generated auth URL:", {
      mode: loginMode,
      ticket,
      authUrl: authUrl.slice(0, 200) + "...",
    });

    logger.info("wechat_auth_url_generated", {
      mode: loginMode,
      hasTicket: !!ticket,
      redirectPath,
    });

    return NextResponse.json({
      url: authUrl,
      mode: loginMode,
      ticket,
      // 如果是二维码模式，前端需要轮询这个接口
      pollUrl: ticket ? `/api/auth/qrcode/poll?ticket=${ticket}` : undefined,
    });
  } catch (error) {
    logger.error("wechat_auth_url_failed", { error: String(error) });
    return NextResponse.json(
      { message: "生成授权链接失败" },
      { status: 500 }
    );
  }
}
