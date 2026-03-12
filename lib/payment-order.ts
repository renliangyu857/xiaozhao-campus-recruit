import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface FinalizeOrderPaymentParams {
  orderNo: string;
  transactionId?: string;
  successTime?: string;
  amountTotal?: number;
  notifyResult?: string;
  source?: "notify" | "query_fallback" | "manual_refresh";
}

export async function finalizeOrderPayment({
  orderNo,
  transactionId,
  successTime,
  amountTotal,
  notifyResult,
  source = "notify",
}: FinalizeOrderPaymentParams) {
  const order = await prisma.order.findUnique({
    where: { orderNo },
  });

  if (!order) {
    logger.error("payment_finalize_order_not_found", { orderNo, source });
    throw new Error(`Order not found: ${orderNo}`);
  }

  if (amountTotal != null && amountTotal !== order.amount) {
    logger.error("payment_finalize_amount_mismatch", {
      orderNo,
      source,
      expected: order.amount,
      actual: amountTotal,
    });
    throw new Error(`Amount mismatch for ${orderNo}: expected ${order.amount}, got ${amountTotal}`);
  }

  logger.info("payment_finalize_started", {
    orderNo,
    source,
    currentPayStatus: order.payStatus,
    currentBizStatus: order.bizStatus,
    transactionId,
  });

  return prisma.$transaction(async (tx) => {
    const latestOrder = await tx.order.findUnique({
      where: { id: order.id },
    });

    if (!latestOrder) {
      throw new Error(`Order disappeared during finalize: ${orderNo}`);
    }

    const paidTime = successTime ? new Date(successTime) : new Date();

    if (latestOrder.payStatus !== "paid") {
      await tx.order.update({
        where: { id: latestOrder.id },
        data: {
          payStatus: "paid",
          payTime: paidTime,
          wxTransactionId: transactionId ?? latestOrder.wxTransactionId,
          bizStatus: latestOrder.bizStatus === "completed" ? latestOrder.bizStatus : "processing",
          notifyCount: notifyResult ? { increment: 1 } : undefined,
          lastNotifyAt: notifyResult ? new Date() : latestOrder.lastNotifyAt,
          notifyResult: notifyResult ?? latestOrder.notifyResult,
        },
      });

      logger.info("payment_finalize_mark_paid", {
        orderNo,
        source,
        transactionId: transactionId ?? latestOrder.wxTransactionId,
      });
    } else if (notifyResult) {
      await tx.order.update({
        where: { id: latestOrder.id },
        data: {
          notifyCount: { increment: 1 },
          lastNotifyAt: new Date(),
          notifyResult,
          wxTransactionId: transactionId ?? latestOrder.wxTransactionId,
          payTime: latestOrder.payTime ?? paidTime,
        },
      });

      logger.info("payment_finalize_record_notify", {
        orderNo,
        source,
        transactionId: transactionId ?? latestOrder.wxTransactionId,
      });
    }

    const refreshedOrder = await tx.order.findUnique({
      where: { id: latestOrder.id },
    });

    if (!refreshedOrder) {
      throw new Error(`Order missing after update: ${orderNo}`);
    }

    if (refreshedOrder.bizStatus !== "completed") {
      if (refreshedOrder.productType === "vip" && refreshedOrder.validStartAt && refreshedOrder.validEndAt) {
        const existingMember = await tx.userMember.findFirst({
          where: {
            userId: refreshedOrder.userId,
            planId: refreshedOrder.productId,
            startAt: refreshedOrder.validStartAt,
            endAt: refreshedOrder.validEndAt,
          },
        });

        if (!existingMember) {
          await tx.userMember.create({
            data: {
              userId: refreshedOrder.userId,
              planId: refreshedOrder.productId,
              startAt: refreshedOrder.validStartAt,
              endAt: refreshedOrder.validEndAt,
            },
          });

          logger.info("payment_finalize_member_created", {
            orderNo,
            source,
            userId: String(refreshedOrder.userId),
            planId: refreshedOrder.productId,
          });
        }

        await tx.order.update({
          where: { id: refreshedOrder.id },
          data: {
            bizStatus: "completed",
            bizResult: {
              type: "vip",
              planId: refreshedOrder.productId,
              validStartAt: refreshedOrder.validStartAt,
              validEndAt: refreshedOrder.validEndAt,
            },
          },
        });
      }

      if (refreshedOrder.productType === "material") {
        await tx.panMaterialPurchase.upsert({
          where: {
            userId_materialId: {
              userId: refreshedOrder.userId,
              materialId: refreshedOrder.productId,
            },
          },
          update: {
            materialName: refreshedOrder.productName,
            price: refreshedOrder.amount / 100,
            orderNo: refreshedOrder.orderNo,
            payStatus: "paid",
            paidAt: paidTime,
          },
          create: {
            userId: refreshedOrder.userId,
            materialId: refreshedOrder.productId,
            materialName: refreshedOrder.productName,
            price: refreshedOrder.amount / 100,
            orderNo: refreshedOrder.orderNo,
            payStatus: "paid",
            paidAt: paidTime,
          },
        });

        logger.info("payment_finalize_material_granted", {
          orderNo,
          source,
          userId: String(refreshedOrder.userId),
          materialId: refreshedOrder.productId,
        });

        await tx.order.update({
          where: { id: refreshedOrder.id },
          data: {
            bizStatus: "completed",
            bizResult: {
              type: "material",
              materialId: refreshedOrder.productId,
            },
          },
        });
      }
    }

    const finalizedOrder = await tx.order.findUnique({
      where: { id: latestOrder.id },
    });

    if (!finalizedOrder) {
      throw new Error(`Order missing after finalize: ${orderNo}`);
    }

    logger.info("payment_finalize_completed", {
      orderNo,
      source,
      payStatus: finalizedOrder.payStatus,
      bizStatus: finalizedOrder.bizStatus,
      transactionId: finalizedOrder.wxTransactionId,
      notifyCount: finalizedOrder.notifyCount,
    });

    return finalizedOrder;
  });
}
