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

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }
  if (!(await isVip(userId))) {
    return NextResponse.json({ message: "仅会员可查看内推码库" }, { status: 403 });
  }
  const { searchParams } = request.nextUrl;
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const size = Math.min(100, Math.max(1, parseInt(searchParams.get("size") ?? "20", 10)));
  const companyName = searchParams.get("companyName")?.trim();
  const where = companyName ? { companyName: { contains: companyName }, isValid: true } : { isValid: true };
  const [list, total] = await Promise.all([
    prisma.referralCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * size,
      take: size,
    }),
    prisma.referralCode.count({ where }),
  ]);
  const content = list.map((r) => ({
    id: String(r.id),
    companyName: r.companyName,
    code: r.code,
    usageCount: r.usageCount,
  }));
  return NextResponse.json({
    content,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    size,
    number: page,
  });
}
