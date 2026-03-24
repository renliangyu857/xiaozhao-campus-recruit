import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { getProductPrice } from "@/lib/payment-config";

export async function GET() {
  try {
    const userId = await getSessionUserId();

    // 如果未登录，使用默认价格（不提供首月优惠）
    const userBigInt = userId ? BigInt(userId) : BigInt(0);

    // 获取所有套餐价格
    const [monthlyPrice, quarterlyPrice, yearlyPrice] = await Promise.all([
      getProductPrice("vip", "1_month", userBigInt),
      getProductPrice("vip", "3_month", userBigInt),
      getProductPrice("vip", "1_year", userBigInt),
    ]);

    const plans = [
      {
        id: "1_month",
        name: "月度会员",
        durationLabel: "1个月",
        price: monthlyPrice.price / 100, // 分转元
        originalPrice: monthlyPrice.originalPrice / 100, // 分转元
        tag: monthlyPrice.isFirstMonth ? "新用户首月" : "月度会员"
      },
      {
        id: "3_month",
        name: "季度会员",
        durationLabel: "3个月",
        price: quarterlyPrice.price / 100,
        originalPrice: quarterlyPrice.originalPrice / 100,
        tag: "春招/实习无忧·推荐"
      },
      {
        id: "1_year",
        name: "年度会员",
        durationLabel: "1年",
        price: yearlyPrice.price / 100,
        originalPrice: yearlyPrice.originalPrice / 100,
        tag: "超值"
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
