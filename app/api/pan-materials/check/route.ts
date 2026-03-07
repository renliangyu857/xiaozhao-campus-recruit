import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const purchases = await prisma.panMaterialPurchase.findMany({
    where: { userId, payStatus: "paid" },
    select: { materialId: true },
  });

  return NextResponse.json({
    purchasedIds: purchases.map((p) => p.materialId),
  });
}
