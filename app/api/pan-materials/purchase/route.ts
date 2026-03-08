import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { getClientIp, rateLimitCheck } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { PAN_MATERIALS_LIST } from "@/lib/panMaterials";

const ORDER_RATE_WINDOW = 60;
const ORDER_RATE_MAX = 10;
const SINGLE_PRICE = 6.6;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimitCheck(`pan_purchase:${ip}`, ORDER_RATE_WINDOW, ORDER_RATE_MAX);
    if (!rl.allowed) {
      logger.warn("pan_material_purchase_rate_limited", { ip });
      return NextResponse.json({ message: "请求过于频繁，请稍后再试" }, { status: 429 });
    }

    const userId = await getSessionUserId();
    if (userId == null) {
      return NextResponse.json({ message: "请先登录" }, { status: 401 });
    }

    let body: { materialId?: string };
    try {
      body = await request.json();
    } catch (e) {
      console.error("解析请求体失败:", e);
      return NextResponse.json({ message: "参数错误" }, { status: 400 });
    }

    const { materialId } = body;
    if (!materialId) {
      return NextResponse.json({ message: "请选择要购买的资料" }, { status: 400 });
    }

    // 检查资料是否存在
    const material = PAN_MATERIALS_LIST.find((m) => m.id === materialId);
    if (!material) {
      return NextResponse.json({ message: "资料不存在" }, { status: 404 });
    }

    // 检查用户是否已购买
    const existing = await prisma.panMaterialPurchase.findUnique({
      where: { userId_materialId: { userId, materialId } },
    });

    if (existing?.payStatus === "paid") {
      return NextResponse.json({
        orderId: existing.orderNo,
        materialId,
        alreadyPurchased: true,
        message: "您已购买过该资料",
      });
    }

    const orderNo = `PM${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // 创建或更新购买记录
    await prisma.panMaterialPurchase.upsert({
      where: { userId_materialId: { userId, materialId } },
      update: {
        orderNo,
        payStatus: "pending",
        price: SINGLE_PRICE,
      },
      create: {
        userId,
        materialId,
        materialName: material.name,
        price: SINGLE_PRICE,
        orderNo,
        payStatus: "pending",
      },
    });

    logger.info("pan_material_purchase_created", {
      userId: String(userId),
      materialId,
      orderNo,
    });

    return NextResponse.json({
      orderId: orderNo,
      materialId,
      materialName: material.name,
      price: SINGLE_PRICE,
      message: "订单创建成功",
    });
  } catch (error) {
    console.error("购买接口错误:", error);
    logger.error("pan_material_purchase_error", {
      error: error instanceof Error ? error.message : "未知错误",
    });
    return NextResponse.json(
      { message: "购买失败，请稍后重试", error: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
}
