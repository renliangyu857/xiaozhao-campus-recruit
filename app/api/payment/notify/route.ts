import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  verifyWechatSignature,
  decryptNotification,
} from "@/lib/wechat-pay";
import { invalidateAuthCurrentCache } from "@/lib/cache";

/**
 * POST /api/payment/notify
 * 微信支付结果通知回调
 * 参考: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_5.shtml
 */
export async function POST(request: NextRequest) {
  const body = await request.text();

  // 获取签名信息
  const signature = request.headers.get("Wechatpay-Signature") || "";
  const timestamp = request.headers.get("Wechatpay-Timestamp") || "";
  const nonce = request.headers.get("Wechatpay-Nonce") || "";
  const serial = request.headers.get("Wechatpay-Serial") || "";

  logger.info("payment_notify_received", {
    timestamp,
    nonce,
    serial,
    bodyLength: body.length,
  });

  try {
    // 验证签名
    const isValid = verifyWechatSignature(timestamp, nonce, body, signature, serial);
    if (!isValid) {
      logger.warn("payment_notify_invalid_signature", { timestamp, nonce });
      return NextResponse.json(
        { code: "FAIL", message: "Invalid signature" },
        { status: 401 }
      );
    }

    // 解析通知数据
    const notification = JSON.parse(body);

    // 解密资源数据
    const resource = notification.resource;
    if (!resource) {
      logger.warn("payment_notify_no_resource", { notification });
      return NextResponse.json(
        { code: "FAIL", message: "No resource" },
        { status: 400 }
      );
    }

    // 解密数据
    const decryptedData = decryptNotification(
      resource.ciphertext,
      resource.associated_data,
      resource.nonce
    );

    logger.info("payment_notify_decrypted", { data: decryptedData });

    const {
      out_trade_no: outTradeNo,
      transaction_id: transactionId,
      trade_state: tradeState,
      success_time: successTime,
      amount,
    } = decryptedData;

    // 只处理支付成功的情况
    if (tradeState !== "SUCCESS") {
      logger.info("payment_notify_not_success", {
        outTradeNo,
        tradeState,
      });

      // 记录通知但返回成功（避免微信重试）
      await recordNotifyAttempt(outTradeNo, body, `Trade state: ${tradeState}`);

      return NextResponse.json({ code: "SUCCESS", message: "OK" });
    }

    // 查询订单
    const order = await prisma.order.findUnique({
      where: { orderNo: outTradeNo },
    });

    if (!order) {
      logger.error("payment_notify_order_not_found", { outTradeNo });
      return NextResponse.json(
        { code: "FAIL", message: "Order not found" },
        { status: 404 }
      );
    }

    // 检查订单是否已处理
    if (order.payStatus === "paid") {
      logger.info("payment_notify_already_paid", { outTradeNo });
      return NextResponse.json({ code: "SUCCESS", message: "OK" });
    }

    // 验证金额
    if (amount && amount.total !== order.amount) {
      logger.error("payment_notify_amount_mismatch", {
        outTradeNo,
        expected: order.amount,
        actual: amount.total,
      });
      return NextResponse.json(
        { code: "FAIL", message: "Amount mismatch" },
        { status: 400 }
      );
    }

    // 更新订单状态并处理业务
    await prisma.$transaction(async (tx) => {
      // 更新订单
      await tx.order.update({
        where: { id: order.id },
        data: {
          payStatus: "paid",
          payTime: successTime ? new Date(successTime) : new Date(),
          wxTransactionId: transactionId,
          bizStatus: "processing",
        },
      });

      // 记录通知
      await tx.order.update({
        where: { id: order.id },
        data: {
          notifyCount: { increment: 1 },
          lastNotifyAt: new Date(),
          notifyResult: JSON.stringify(decryptedData),
        },
      });

      // 处理VIP订单
      if (order.productType === "vip" && order.validStartAt && order.validEndAt) {
        // 创建会员记录
        await tx.userMember.create({
          data: {
            userId: order.userId,
            planId: order.productId,
            startAt: order.validStartAt,
            endAt: order.validEndAt,
          },
        });

        // 更新订单业务状态
        await tx.order.update({
          where: { id: order.id },
          data: {
            bizStatus: "completed",
            bizResult: {
              type: "vip",
              planId: order.productId,
              validStartAt: order.validStartAt,
              validEndAt: order.validEndAt,
            },
          },
        });
      }

      // 处理资料订单
      if (order.productType === "material") {
        // 创建或更新资料购买记录，兼容历史 pending 记录和重复通知
        await tx.panMaterialPurchase.upsert({
          where: {
            userId_materialId: {
              userId: order.userId,
              materialId: order.productId,
            },
          },
          update: {
            materialName: order.productName,
            price: order.amount / 100,
            orderNo: order.orderNo,
            payStatus: "paid",
            paidAt: successTime ? new Date(successTime) : new Date(),
          },
          create: {
            userId: order.userId,
            materialId: order.productId,
            materialName: order.productName,
            price: order.amount / 100,
            orderNo: order.orderNo,
            payStatus: "paid",
            paidAt: successTime ? new Date(successTime) : new Date(),
          },
        });

        // 更新订单业务状态
        await tx.order.update({
          where: { id: order.id },
          data: {
            bizStatus: "completed",
            bizResult: {
              type: "material",
              materialId: order.productId,
            },
          },
        });
      }
    });

    // 清除用户缓存
    await invalidateAuthCurrentCache(Number(order.userId));

    logger.info("payment_notify_success", {
      outTradeNo,
      transactionId,
      userId: String(order.userId),
      productType: order.productType,
    });

    return NextResponse.json({ code: "SUCCESS", message: "OK" });
  } catch (error) {
    logger.error("payment_notify_error", {
      error: String(error),
      body,
    });

    return NextResponse.json(
      { code: "FAIL", message: "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * 记录通知尝试（用于非成功状态）
 */
async function recordNotifyAttempt(
  orderNo: string,
  notifyBody: string,
  result: string
) {
  try {
    await prisma.order.updateMany({
      where: { orderNo },
      data: {
        notifyCount: { increment: 1 },
        lastNotifyAt: new Date(),
        notifyResult: result,
      },
    });
  } catch (error) {
    logger.error("payment_notify_record_failed", { orderNo, error: String(error) });
  }
}
