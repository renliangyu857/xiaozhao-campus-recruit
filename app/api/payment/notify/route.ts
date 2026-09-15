import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { verifyNotifySign, getEzfpNotifyConfig } from "@/lib/ezfp";
import { invalidateAuthCurrentCache } from "@/lib/cache";
import { finalizeOrderPayment } from "@/lib/payment-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ezfp 异步通知：官方为 GET 回调（参数在 query string），此处同时兼容 POST(form)。
 * 校验平台公钥签名后，TRADE_SUCCESS 即落库；响应体返回 success 告知网关停止重试。
 */

function paramsToRecord(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
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

  try {
    const cfg = getEzfpNotifyConfig();
    const isValid = verifyNotifySign(params, cfg.publicKey);
    if (!isValid) {
      logger.warn("payment_notify_invalid_signature", { outTradeNo: params.out_trade_no });
      return new NextResponse("fail", { status: 401, headers: { "Content-Type": "text/plain" } });
    }

    const outTradeNo = params.out_trade_no;
    const tradeNo = params.trade_no;
    const tradeStatus = params.trade_status;

    if (!outTradeNo) {
      return new NextResponse("fail", { status: 400, headers: { "Content-Type": "text/plain" } });
    }

    // 仅 SUCCESS 状态才落库（其它状态如 WAIT_BUYER_PAY / TRADE_CLOSED 忽略）
    if (tradeStatus === "TRADE_SUCCESS") {
      const finalizedOrder = await finalizeOrderPayment({
        orderNo: outTradeNo,
        transactionId: tradeNo,
        amountTotal: undefined, // ezfp 回调不含金额，跳过金额校验（以订单记录为准）
        notifyResult: JSON.stringify(params),
        source: "notify",
      });

      await invalidateAuthCurrentCache(Number(finalizedOrder.userId));

      logger.info("payment_notify_success", {
        outTradeNo,
        tradeNo,
        userId: String(finalizedOrder.userId),
        productType: finalizedOrder.productType,
        payStatus: finalizedOrder.payStatus,
        bizStatus: finalizedOrder.bizStatus,
      });
    } else {
      logger.info("payment_notify_non_success", { outTradeNo, tradeStatus });
    }

    // ezfp 期望响应体包含 success 以停止重试
    return new NextResponse("success", { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (error) {
    logger.error("payment_notify_error", { error: String(error), outTradeNo: params.out_trade_no });
    return new NextResponse("fail", { status: 500, headers: { "Content-Type": "text/plain" } });
  }
}

export async function GET(request: NextRequest) {
  return handleNotify(request);
}

export async function POST(request: NextRequest) {
  return handleNotify(request);
}
