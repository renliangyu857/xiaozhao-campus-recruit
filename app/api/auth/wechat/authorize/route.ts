import { NextRequest, NextResponse } from "next/server";
import { generateAuthUrl } from "@/lib/wechat";

/**
 * GET /api/auth/wechat/authorize
 * 生成微信 OAuth 授权链接并重定向
 *
 * 查询参数:
 * - ticket: 扫码登录的票据（可选）
 * - redirect: 登录成功后跳转路径（可选，默认 /）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticket = searchParams.get("ticket");
  const redirect = searchParams.get("redirect") || "/";

  console.log("[WechatAuthorize] Generating auth URL:", { ticket, redirect });

  try {
    // 生成授权 URL
    const authUrl = generateAuthUrl({
      redirectPath: redirect,
      ticket: ticket || undefined,
    });

    console.log("[WechatAuthorize] Redirecting to:", authUrl);

    // 重定向到微信授权页面
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[WechatAuthorize] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}
