import { NextResponse } from "next/server";

const DEFAULT_PLANS = [
  { id: "1_month", name: "月度会员", durationLabel: "1个月", price: 5.8, originalPrice: 9.9, tag: "新用户首月" },
  { id: "3_month", name: "季度会员", durationLabel: "3个月", price: 16.6, originalPrice: 49.9, tag: "春招/实习无忧·推荐" },
  { id: "1_year", name: "年度会员", durationLabel: "1年", price: 49.9, originalPrice: 118.8, tag: "超值" },
];

export async function GET() {
  return NextResponse.json(DEFAULT_PLANS);
}
