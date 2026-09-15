import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { PAN_MATERIALS_LIST } from "@/lib/panMaterials";
import { getMemberEntitlement } from "@/lib/member-entitlement";

// 只有永久会员无差别解锁全部资料，体验会员不包含资料下载权益。
async function checkCanDownloadMaterials(userId: number): Promise<boolean> {
  const now = new Date();
  const membership = await prisma.userMember.findFirst({
    where: { userId, startAt: { lte: now }, endAt: { gte: now } },
    orderBy: { endAt: "desc" },
  });
  return getMemberEntitlement(membership, now).canDownloadMaterials;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const canDownloadMaterials = await checkCanDownloadMaterials(userId);
  if (canDownloadMaterials) {
    // 永久会员：返回全部资料 ID，前端据此放开所有下载
    return NextResponse.json({
      purchasedIds: PAN_MATERIALS_LIST.map((m) => m.id),
      isVip: true,
      canDownloadMaterials: true,
    });
  }

  const purchases = await prisma.panMaterialPurchase.findMany({
    where: { userId, payStatus: "paid" },
    select: { materialId: true },
  });

  return NextResponse.json({
    purchasedIds: purchases.map((p) => p.materialId),
    isVip: false,
    canDownloadMaterials: false,
  });
}
