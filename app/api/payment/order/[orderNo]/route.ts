import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { logger } from "@/lib/logger";

/**
 * GET /api/payment/order/:orderNo
 * 查询订单状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  const { orderNo } = await params;

  // 验证用户登录
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { orderNo },
    });

    if (!order) {
      return NextResponse.json({ message: "订单不存在" }, { status: 404 });
    }

    // 验证订单所属用户
    if (order.userId !== BigInt(userId)) {
      return NextResponse.json({ message: "无权查看此订单" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        orderNo: order.orderNo,
        payStatus: order.payStatus,
        productType: order.productType,
        productName: order.productName,
        amount: order.amount,
        originalAmount: order.originalAmount,
        payTime: order.payTime?.toISOString(),
        validEndAt: order.validEndAt?.toISOString(),
        createdAt: order.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("payment_query_error", {
      orderNo,
      userId: String(userId),
      error: String(error),
    });

    return NextResponse.json(
      { message: "查询订单失败" },
      { status: 500 }
    );
  }
}
