import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { verifyNotifySign as verifyEzfpSign, getEzfpNotifyConfig } from "@/lib/ezfp";
import { verifyAlipayNotifySign, getAlipayConfig } from "@/lib/alipay";
import { invalidateAuthCurrentCache } from "@/lib/cache";
import { finalizeOrderPayment } from "@/lib/payment-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 异步通知：兼容 ezfp（V2 / SHA256WithRSA）与 alipay（V3 / RSA2）。
 * 通过参数特征自动识别：
 *   - ezfp:  GET 为主（参数在 query string），POST 也兼容（application/x-www-form-urlencoded）
 *   - alipay: POST application/x-www-form-urlencoded（标准异步通知）
 *
 * 校验对应公钥签名后，落库并响应 success 告知网关停止重试。
 */

function paramsToRecord(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

/** 自动识别回调渠道：alipay 的 notify_id / gmt_payment / app_id → alipay；其它 → ezfp */
function detectProvider(params: Record<string, string>): "ezfp" | "alipay" {
  if (params.app_id && params.notify_id) return "alipay";
  return "ezfp";
}

async function handleEzfpNotify(params: Record<string, string>): Promise<NextResponse> {
  try {
    const cfg = getEzfpNotifyConfig();
    const isValid = verifyEzfpSign(params, cfg.publicKey);
    if (!isValid) {
      logger.warn("payment_notify_invalid_signature", {
        provider: "ezfp",
        outTradeNo: params.out_trade_no,
      });
      return new NextResponse("fail", { status: 401, headers: { "Content-Type": "text/plain" } });
    }

    const outTradeNo = params.out_trade_no;
    const tradeNo = params.trade_no;
    const tradeStatus = params.trade_status;

    if (!outTradeNo) {
      return new NextResponse("fail", { status: 400, headers: { "Content-Type": "text/plain" } });
    }

    if (tradeStatus === "TRADE_SUCCESS") {
      const finalizedOrder = await finalizeOrderPayment({
        orderNo: outTradeNo,
        transactionId: tradeNo,
        amountTotal: undefined,
        notifyResult: JSON.stringify(params),
        source: "notify",
      });

      await invalidateAuthCurrentCache(Number(finalizedOrder.userId));

      logger.info("payment_notify_success", {
        provider: "ezfp",
        outTradeNo,
        tradeNo,
        userId: String(finalizedOrder.userId),
        productType: finalizedOrder.productType,
        payStatus: finalizedOrder.payStatus,
        bizStatus: finalizedOrder.bizStatus,
      });
    } else {
      logger.info("payment_notify_non_success", {
        provider: "ezfp",
        outTradeNo,
        tradeStatus,
      });
    }

    return new NextResponse("success", { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (error) {
    logger.error("payment_notify_error", {
      provider: "ezfp",
      error: String(error),
      outTradeNo: params.out_trade_no,
    });
    return new NextResponse("fail", { status: 500, headers: { "Content-Type": "text/plain" } });
  }
}

async function handleAlipayNotify(params: Record<string, string>): Promise<NextResponse> {
  // 支付宝要求返回 "success"（纯文本）停止重试；其它任意值都视为失败继续重试
  try {
    const cfg = getAlipayConfig();
    const isValid = verifyAlipayNotifySign(params, cfg.alipayPublicKey);
    if (!isValid) {
      logger.warn("payment_notify_invalid_signature", {
        provider: "alipay",
        outTradeNo: params.out_trade_no,
      });
      return new NextResponse("fail", { status: 401, headers: { "Content-Type": "text/plain" } });
    }

    const outTradeNo = params.out_trade_no;
    const tradeNo = params.trade_no;
    const tradeStatus = params.trade_status;
    const totalAmount = params.total_amount; // 字符串如 "19.90"
    const gmtPayment = params.gmt_payment;

    if (!outTradeNo) {
      return new NextResponse("fail", { status: 400, headers: { "Content-Type": "text/plain" } });
    }

    if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
      // 支付宝回调单位是元（2 位小数），订单 amount 单位是分；不强制校验，避免汇率/精度问题
      const amountFen = totalAmount ? Math.round(Number(totalAmount) * 100) : undefined;
      const finalizedOrder = await finalizeOrderPayment({
        orderNo: outTradeNo,
        transactionId: tradeNo,
        successTime: gmtPayment,
        amountTotal: amountFen,
        notifyResult: JSON.stringify(params),
        source: "notify",
      });

      await invalidateAuthCurrentCache(Number(finalizedOrder.userId));

      logger.info("payment_notify_success", {
        provider: "alipay",
        outTradeNo,
        tradeNo,
        gmtPayment,
        totalAmount,
        userId: String(finalizedOrder.userId),
        productType: finalizedOrder.productType,
        payStatus: finalizedOrder.payStatus,
        bizStatus: finalizedOrder.bizStatus,
      });
    } else {
      logger.info("payment_notify_non_success", {
        provider: "alipay",
        outTradeNo,
        tradeStatus,
      });
    }

    return new NextResponse("success", { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (error) {
    logger.error("payment_notify_error", {
      provider: "alipay",
      error: String(error),
      outTradeNo: params.out_trade_no,
    });
    return new NextResponse("fail", { status: 500, headers: { "Content-Type": "text/plain" } });
  }
}

async function handleNotify(request: NextRequest): Promise<NextResponse> {
  let params: Record<string, string>;

  if (request.method === "POST") {
    const text = await request.text();
    params = paramsToRecord(new URLSearchParams(text));
  } else {
    params = paramsToRecord(request.nextUrl.searchParams);
  }

  logger.info("payment_notify_received", {
    method: request.method,
    outTradeNo: params.out_trade_no,
    tradeStatus: params.trade_status,
    paramKeys: Object.keys(params),
  });

  const provider = detectProvider(params);
  if (provider === "alipay") {
    return handleAlipayNotify(params);
  }
  return handleEzfpNotify(params);
}

export async function GET(request: NextRequest) {
  return handleNotify(request);
}

export async function POST(request: NextRequest) {
  return handleNotify(request);
}
