import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { logger } from "@/lib/logger";
import { invalidateAuthCurrentCache } from "@/lib/cache";
import { finalizeOrderPayment } from "@/lib/payment-order";
import { queryEzfpOrder } from "@/lib/ezfp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payment/order/:orderNo
 * 查询订单状态；当异步通知丢失时，主动向微信查询并补账
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  const { orderNo } = await params;

  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  try {
    let order = await prisma.order.findUnique({
      where: { orderNo },
    });

    if (!order) {
      return NextResponse.json({ message: "订单不存在" }, { status: 404 });
    }

    if (order.userId !== BigInt(userId)) {
      return NextResponse.json({ message: "无权查看此订单" }, { status: 403 });
    }

    logger.info("payment_order_detail_viewed", {
      orderNo,
      userId: String(userId),
      payStatus: order.payStatus,
      bizStatus: order.bizStatus,
    });

    if (order.payStatus === "pending") {
      try {
        const ezfpOrder = await queryEzfpOrder(orderNo);

        logger.info("payment_query_ezfp_fallback_checked", {
          orderNo,
          userId: String(userId),
          status: ezfpOrder.status,
        });

        if (ezfpOrder.status === 1) {
          order = await finalizeOrderPayment({
            orderNo,
            transactionId: ezfpOrder.tradeNo,
            successTime: undefined,
            amountTotal: order.amount,
            notifyResult: JSON.stringify({
              source: "query_order_fallback",
              status: ezfpOrder.status,
              tradeNo: ezfpOrder.tradeNo,
              outTradeNo: ezfpOrder.outTradeNo,
              money: ezfpOrder.money,
            }),
            source: "query_fallback",
          });

          await invalidateAuthCurrentCache(Number(order.userId));
        }
      } catch (ezfpError) {
        logger.warn("payment_query_ezfp_fallback_failed", {
          orderNo,
          userId: String(userId),
          error: String(ezfpError),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        orderNo: order.orderNo,
        payStatus: order.payStatus,
        bizStatus: order.bizStatus,
        productType: order.productType,
        productId: order.productId,
        productName: order.productName,
        amount: order.amount,
        originalAmount: order.originalAmount,
        payTime: order.payTime?.toISOString(),
        validEndAt: order.validEndAt?.toISOString(),
        createdAt: order.createdAt.toISOString(),
        wxTransactionId: order.wxTransactionId ?? undefined,
        notifyCount: order.notifyCount,
        lastNotifyAt: order.lastNotifyAt?.toISOString(),
        canRefresh: order.payStatus === "pending",
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
