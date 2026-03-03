import { NextRequest, NextResponse } from "next/server";
import { getLoginTicket, LoginTicketStatus } from "@/lib/wechatTicket";
import { setSessionUserId } from "@/lib/session";
import { invalidateAuthCurrentCache } from "@/lib/cache";

/**
 * GET /api/auth/qrcode/poll?ticket=xxx
 * 轮询检查扫码登录状态
 *
 * 返回状态:
 * - pending: 等待扫码
 * - scanned: 已扫码，等待确认
 * - success: 登录成功，返回用户信息
 * - expired: 二维码已过期
 * - cancelled: 用户取消登录
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticket = searchParams.get("ticket");

  if (!ticket) {
    return NextResponse.json(
      { message: "缺少 ticket 参数" },
      { status: 400 }
    );
  }

  const ticketData = await getLoginTicket(ticket);

  if (!ticketData) {
    return NextResponse.json(
      { status: "expired", message: "二维码已过期" },
      { status: 200 }
    );
  }

  // 登录成功：设置 session
  if (ticketData.status === "success" && ticketData.userId) {
    const userId = parseInt(ticketData.userId, 10);
    const res = NextResponse.json({
      status: "success",
      userId: ticketData.userId,
    });

    // 设置 cookie
    await setSessionUserId(userId);
    await invalidateAuthCurrentCache(userId);

    return res;
  }

  // 返回当前状态
  return NextResponse.json({
    status: ticketData.status,
    ...(ticketData.status === "scanned" && { openid: ticketData.openid }),
  });
}
