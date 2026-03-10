import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateQRCode } from "@/lib/wechat-pay";
import { logger } from "@/lib/logger";
import { PAYMENT_ORDER_EXPIRY_MS } from "@/lib/payment-constants";

/**
 * GET /api/payment/qrcode/:orderNo
 * 获取订单的支付二维码图片
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  const { orderNo } = await params;

  try {
    // 查询订单
    const order = await prisma.order.findUnique({
      where: { orderNo },
    });

    if (!order) {
      return NextResponse.json({ message: "订单不存在" }, { status: 404 });
    }

    // 检查订单状态
    if (order.payStatus !== "pending") {
      return NextResponse.json(
        { message: `订单已${order.payStatus === "paid" ? "支付" : "关闭"}` },
        { status: 400 }
      );
    }

    // 检查订单是否过期（5分钟）
    const orderAge = Date.now() - new Date(order.createdAt).getTime();
    if (orderAge > PAYMENT_ORDER_EXPIRY_MS) {
      return NextResponse.json(
        { message: "订单已过期，请重新创建" },
        { status: 400 }
      );
    }

    // 如果没有二维码URL，返回错误
    if (!order.wxCodeUrl) {
      return NextResponse.json(
        { message: "二维码未生成" },
        { status: 500 }
      );
    }

    // 生成二维码图片
    const qrBuffer = await generateQRCode(order.wxCodeUrl);

    // 返回图片
    return new NextResponse(new Uint8Array(qrBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    logger.error("payment_qrcode_error", {
      orderNo,
      error: String(error),
    });

    return NextResponse.json(
      { message: "生成二维码失败" },
      { status: 500 }
    );
  }
}
