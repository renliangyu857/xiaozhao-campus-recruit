import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const payStatus = searchParams.get("status")?.trim() || undefined;
  const productType = searchParams.get("productType")?.trim() || undefined;
  const limitParam = Number(searchParams.get("limit") || 20);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;

  try {
    const where = {
      userId: BigInt(userId),
      ...(payStatus ? { payStatus } : {}),
      ...(productType ? { productType } : {}),
    };

    const [orders, total, pendingCount, paidCount] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.order.count({ where }),
      prisma.order.count({ where: { userId: BigInt(userId), payStatus: "pending" } }),
      prisma.order.count({ where: { userId: BigInt(userId), payStatus: "paid" } }),
    ]);

    logger.info("payment_orders_list_viewed", {
      userId: String(userId),
      total,
      limit,
      payStatus: payStatus ?? "all",
      productType: productType ?? "all",
    });

    return NextResponse.json({
      success: true,
      data: {
        total,
        pendingCount,
        paidCount,
        items: orders.map((order) => ({
          orderNo: order.orderNo,
          productType: order.productType,
          productId: order.productId,
          productName: order.productName,
          amount: order.amount,
          originalAmount: order.originalAmount,
          payStatus: order.payStatus,
          bizStatus: order.bizStatus,
          payTime: order.payTime?.toISOString(),
          createdAt: order.createdAt.toISOString(),
          validEndAt: order.validEndAt?.toISOString(),
        })),
      },
    });
  } catch (error) {
    logger.error("payment_orders_list_error", {
      userId: String(userId),
      payStatus: payStatus ?? "all",
      productType: productType ?? "all",
      error: String(error),
    });

    return NextResponse.json({ message: "查询订单列表失败" }, { status: 500 });
  }
}
