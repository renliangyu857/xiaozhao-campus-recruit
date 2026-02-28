import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

async function isVip(userId: number): Promise<boolean> {
  const m = await prisma.userMember.findFirst({
    where: { userId, endAt: { gte: new Date() } },
    orderBy: { endAt: "desc" },
  });
  return !!m;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }
  if (!(await isVip(userId))) {
    return NextResponse.json({ message: "仅会员可使用内推码" }, { status: 403 });
  }
  const { id } = await params;
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    return new NextResponse(null, { status: 404 });
  }
  const ref = await prisma.referralCode.findUnique({
    where: { id: idNum },
  });
  if (!ref || !ref.isValid) {
    return new NextResponse(null, { status: 404 });
  }
  await prisma.referralCode.update({
    where: { id: idNum },
    data: { usageCount: ref.usageCount + 1 },
  });
  return NextResponse.json({ message: "已使用" });
}
