import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }
  const member = await prisma.userMember.findFirst({
    where: { userId, endAt: { gte: new Date() } },
    orderBy: { endAt: "desc" },
  });
  const referralCount = await prisma.referralCode.count({ where: { isValid: true } });
  return NextResponse.json({
    isVip: !!member,
    planId: member?.planId,
    isTrial: false,
    vipExpiry: member ? member.endAt.toISOString().slice(0, 10) : undefined,
    referralCodeCount: referralCount,
    savedQueryCount: 0,
  });
}
