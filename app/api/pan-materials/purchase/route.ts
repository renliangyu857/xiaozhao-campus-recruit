import { NextResponse } from "next/server";

// 资料不再单独售卖：19.9 永久会员无差别解锁全部网盘资料。
// 该接口保留仅用于向前端返回明确引导，不再创建任何订单。
export async function POST() {
  return NextResponse.json(
    {
      message: "资料已随永久会员（¥19.9）一并解锁，无需单独购买",
      redirectTo: "/vip",
    },
    { status: 402 }
  );
}
