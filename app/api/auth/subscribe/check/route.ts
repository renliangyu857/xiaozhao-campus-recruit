import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLoginTicket } from "@/lib/wechatTicket";
import { getWechatAccessToken, getUserSubscribeStatus } from "@/lib/wechat";

/**
 * GET /api/auth/subscribe/check?ticket=xxx
 * 检查用户是否已关注服务号
 * 优先从微信 API 实时查询，失败时回退到数据库状态
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

  // 获取 ticket 信息
  const ticketData = await getLoginTicket(ticket);

  if (!ticketData || !ticketData.openid) {
    return NextResponse.json(
      { message: "登录会话已过期，请重新扫码" },
      { status: 400 }
    );
  }

  const openid = ticketData.openid;

  // 先查询数据库中的用户状态
  const user = await prisma.appUser.findUnique({
    where: { openId: openid },
    select: { id: true, isSubscribed: true },
  });

  // 如果数据库显示已关注，直接返回
  if (user?.isSubscribed) {
    return NextResponse.json({ subscribed: true });
  }

  // 尝试从微信 API 实时查询关注状态
  try {
    const accessToken = await getWechatAccessToken();
    const isSubscribed = await getUserSubscribeStatus(accessToken, openid);

    // 如果微信显示已关注，更新数据库并返回
    if (isSubscribed && user) {
      await prisma.appUser.update({
        where: { id: user.id },
        data: {
          isSubscribed: true,
          subscribedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ subscribed: isSubscribed });
  } catch (error) {
    console.error("[SubscribeCheck] Failed to query WeChat API:", error);
    // API 查询失败时，回退到数据库状态
    return NextResponse.json({ subscribed: user?.isSubscribed ?? false });
  }
}
