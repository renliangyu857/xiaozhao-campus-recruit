import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { getClientIp, rateLimitCheck } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import {
  getProductPrice,
  calculateVipValidity,
  generateOrderNo,
  isValidProduct,
  type ProductType,
} from "@/lib/payment-config";
import {
  PAYMENT_ORDER_EXPIRY_MS,
  getPaymentOrderExpiryTime,
} from "@/lib/payment-constants";
import { createEzfpOrder } from "@/lib/ezfp";

const ORDER_RATE_WINDOW = 60;
const ORDER_RATE_MAX = 10;

/**
 * POST /api/payment/create
 * 创建支付订单
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // 频率限制
  const rl = await rateLimitCheck(`payment:create:${ip}`, ORDER_RATE_WINDOW, ORDER_RATE_MAX);
  if (!rl.allowed) {
    logger.warn("payment_create_rate_limited", { ip });
    return NextResponse.json({ message: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  // 验证用户登录
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  // 解析请求体
  let body: {
    productType?: string;
    productId?: string;
    materialId?: string;
    materialName?: string;
    materialPrice?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "请求参数错误" }, { status: 400 });
  }

  const { productType, productId, materialPrice } = body;
  // materialId 和 materialName 预留用于资料购买功能
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { materialId, materialName } = body;

  // 验证参数
  if (!productType || !productId) {
    return NextResponse.json({ message: "缺少商品信息" }, { status: 400 });
  }

  if (!isValidProduct(productType as ProductType, productId)) {
    return NextResponse.json({ message: "无效的商品" }, { status: 400 });
  }

  try {
    if (productType === "material") {
      // 资料已随 19.9 永久会员解锁，不再单独售卖
      return NextResponse.json(
        { message: "资料已随永久会员（¥19.9）一并解锁，无需单独购买" },
        { status: 400 }
      );
    }

    // 获取商品价格
    const { price, originalPrice, productName, isFirstMonth } = await getProductPrice(
      productType as ProductType,
      productId,
      BigInt(userId),
      materialPrice
    );
    const finalProductName =
      productType === "material" && materialName?.trim()
        ? materialName.trim()
        : productName;

    // 检查是否有未完成的相同商品订单（幂等性）
    const existingOrder = await prisma.order.findFirst({
      where: {
        userId: BigInt(userId),
        productType,
        productId,
        payStatus: "pending",
        createdAt: {
          gte: new Date(Date.now() - PAYMENT_ORDER_EXPIRY_MS),
        },
      },
    });

    if (existingOrder) {
      // 返回已有订单
      logger.info("payment_create_reuse_order", {
        orderNo: existingOrder.orderNo,
        userId: String(userId),
      });

      return NextResponse.json({
        success: true,
        data: {
          orderNo: existingOrder.orderNo,
          productName: existingOrder.productName,
          amount: existingOrder.amount,
          originalAmount: existingOrder.originalAmount,
          isFirstMonth: false,
          qrcodeUrl: existingOrder.wxCodeUrl,
          qrcodeImageUrl: `/api/payment/qrcode/${existingOrder.orderNo}`,
          expiryTime: getPaymentOrderExpiryTime(existingOrder.createdAt),
        },
      });
    }

    // 计算VIP有效期（如果是VIP订单）
    let validStartAt: Date | undefined;
    let validEndAt: Date | undefined;

    if (productType === "vip") {
      // 查询用户当前有效会员
      const now = new Date();
      const currentMember = await prisma.userMember.findFirst({
        where: {
          userId: BigInt(userId),
          endAt: { gte: now },
        },
        orderBy: { endAt: "desc" },
      });

      const validity = calculateVipValidity(
        "lifetime",
        currentMember?.endAt
      );
      validStartAt = validity.startAt;
      validEndAt = validity.endAt;
    }

    // 生成订单号
    const orderNo = generateOrderNo();

    // 获取通知URL
    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.xiaozhaomiao.cn").replace(/\/+$/, "");
    const notifyUrl = `${appBaseUrl}/api/payment/notify`;

    // 创建 ezfp 支付订单
    let wxCodeUrl: string;
    let wxTransactionId: string;

    try {
      const ezfpOrder = await createEzfpOrder({
        outTradeNo: orderNo,
        name: finalProductName,
        moneyYuan: (price / 100).toFixed(2),
        notifyUrl,
        clientIp: ip,
      });

      wxCodeUrl = ezfpOrder.payInfo; // 二维码内容（字符串）
      wxTransactionId = ezfpOrder.tradeNo;
    } catch (ezError) {
      logger.error("payment_create_ezfp_failed", {
        userId: String(userId),
        orderNo,
        error: String(ezError),
      });

      return NextResponse.json(
        { message: "创建支付订单失败，请稍后重试" },
        { status: 500 }
      );
    }

    // 创建订单记录
    const order = await prisma.order.create({
      data: {
        orderNo,
        userId: BigInt(userId),
        productType,
        productId,
        productName: finalProductName,
        amount: price,
        originalAmount: originalPrice,
        payStatus: "pending",
        wxCodeUrl,
        wxTransactionId, // ezfp trade_no
        validStartAt,
        validEndAt,
        clientIp: ip,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    logger.info("payment_create_success", {
      orderNo,
      userId: String(userId),
      productType,
      productId,
      amount: price,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderNo: order.orderNo,
        productName: order.productName,
        amount: order.amount,
        originalAmount: order.originalAmount,
        isFirstMonth,
        qrcodeUrl: order.wxCodeUrl,
        qrcodeImageUrl: `/api/payment/qrcode/${order.orderNo}`,
        expiryTime: getPaymentOrderExpiryTime(order.createdAt),
      },
    });
  } catch (error) {
    logger.error("payment_create_error", {
      userId: String(userId),
      error: String(error),
    });

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "创建订单失败" },
      { status: 500 }
    );
  }
}
