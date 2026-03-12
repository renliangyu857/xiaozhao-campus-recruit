import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  verifyWechatSignature,
  decryptNotification,
} from "@/lib/wechat-pay";
import { invalidateAuthCurrentCache } from "@/lib/cache";
import { finalizeOrderPayment } from "@/lib/payment-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payment/notify
 * 微信支付结果通知回调
 */
export async function POST(request: NextRequest) {
  const body = await request.text();

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
    const isValid = verifyWechatSignature(timestamp, nonce, body, signature, serial);
    if (!isValid) {
      logger.warn("payment_notify_invalid_signature", { timestamp, nonce, serial });
      return NextResponse.json(
        { code: "FAIL", message: "Invalid signature" },
        { status: 401 }
      );
    }

    const notification = JSON.parse(body);
    const resource = notification.resource;
    if (!resource) {
      logger.warn("payment_notify_no_resource", { notification });
      return NextResponse.json(
        { code: "FAIL", message: "No resource" },
        { status: 400 }
      );
    }

    const decryptedData = decryptNotification(
      resource.ciphertext,
      resource.associated_data,
      resource.nonce
    );

    const {
      out_trade_no: outTradeNo,
      transaction_id: transactionId,
      trade_state: tradeState,
      success_time: successTime,
      amount,
    } = decryptedData;

    logger.info("payment_notify_decrypted", {
      outTradeNo,
      tradeState,
      transactionId,
      amountTotal: amount?.total,
    });

    if (tradeState !== "SUCCESS") {
      logger.info("payment_notify_not_success", {
        outTradeNo,
        tradeState,
      });

      return NextResponse.json({ code: "SUCCESS", message: "OK" });
    }

    const finalizedOrder = await finalizeOrderPayment({
      orderNo: outTradeNo,
      transactionId,
      successTime,
      amountTotal: amount?.total,
      notifyResult: JSON.stringify(decryptedData),
      source: "notify",
    });

    await invalidateAuthCurrentCache(Number(finalizedOrder.userId));

    logger.info("payment_notify_success", {
      outTradeNo,
      transactionId,
      userId: String(finalizedOrder.userId),
      productType: finalizedOrder.productType,
      payStatus: finalizedOrder.payStatus,
      bizStatus: finalizedOrder.bizStatus,
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
