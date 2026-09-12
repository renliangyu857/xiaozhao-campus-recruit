import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { getProductPrice } from "@/lib/payment-config";

export async function GET() {
  try {
    const userId = await getSessionUserId();

    // 如果未登录，使用默认价格
    const userBigInt = userId ? BigInt(userId) : BigInt(0);

    const p = await getProductPrice("vip", "lifetime", userBigInt);

    const plans = [
      {
        id: "lifetime",
        name: p.productName,
        durationLabel: "永久",
        price: p.price / 100, // 分转元
        originalPrice: p.originalPrice / 100, // 分转元
        tag: "一次付费 · 终身全功能",
      },
    ];

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Error fetching VIP plans:", error);
    return NextResponse.json(
      { error: "获取套餐价格失败" },
      { status: 500 }
    );
  }
}
