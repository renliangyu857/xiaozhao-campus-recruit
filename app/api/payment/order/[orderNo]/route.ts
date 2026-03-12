import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { logger } from "@/lib/logger";
import { invalidateAuthCurrentCache } from "@/lib/cache";
import { finalizeOrderPayment } from "@/lib/payment-order";
import { queryOrder } from "@/lib/wechat-pay";

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
        const wxOrder = await queryOrder(orderNo);

        logger.info("payment_query_wechat_fallback_checked", {
          orderNo,
          userId: String(userId),
          tradeState: wxOrder.tradeState,
        });

        if (wxOrder.tradeState === "SUCCESS") {
          order = await finalizeOrderPayment({
            orderNo,
            transactionId: wxOrder.transactionId,
            successTime: wxOrder.successTime,
            amountTotal: wxOrder.amount?.total,
            notifyResult: JSON.stringify({
              source: "query_order_fallback",
              tradeState: wxOrder.tradeState,
              transactionId: wxOrder.transactionId,
              successTime: wxOrder.successTime,
              amount: wxOrder.amount,
            }),
            source: "query_fallback",
          });

          await invalidateAuthCurrentCache(Number(order.userId));
        }
      } catch (wechatError) {
        logger.warn("payment_query_wechat_fallback_failed", {
          orderNo,
          userId: String(userId),
          error: String(wechatError),
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
