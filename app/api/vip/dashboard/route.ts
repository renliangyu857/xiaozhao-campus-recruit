import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const now = new Date();

  // 查询所有有效会员记录（按开始时间排序）
  const members = await prisma.userMember.findMany({
    where: { userId, endAt: { gte: now } },
    orderBy: { startAt: "asc" },
  });

  // 计算累计有效会员时长（去重，不重复计算重叠的时间段）
  let totalDays = 0;
  let currentEnd: Date | null = null;

  for (const member of members) {
    const start = member.startAt > now ? member.startAt : now;
    if (currentEnd === null || start > currentEnd) {
      // 新的不重叠时间段
      const days = Math.ceil((member.endAt.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      totalDays += Math.max(0, days);
      currentEnd = member.endAt;
    } else if (member.endAt > currentEnd) {
      // 有延长，只计算延长部分
      const days = Math.ceil((member.endAt.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));
      totalDays += Math.max(0, days);
      currentEnd = member.endAt;
    }
  }

  // 找出结束时间最晚的会员记录用于显示
  const latestMember = members.length > 0
    ? members.reduce((latest, current) =>
        current.endAt > latest.endAt ? current : latest
      )
    : null;

  // 笔面试资料下载权限：累计有效时长 >= 90天（3个月）
  const canDownloadMaterials = totalDays >= 90;

  const referralCount = await prisma.referralCode.count({ where: { isValid: true } });

  return NextResponse.json({
    isVip: members.length > 0,
    planId: latestMember?.planId,
    isTrial: false,
    vipExpiry: latestMember ? latestMember.endAt.toISOString().slice(0, 10) : undefined,
    referralCodeCount: referralCount,
    savedQueryCount: 0,
    totalValidDays: totalDays, // 累计有效天数
    canDownloadMaterials, // 是否有资料下载权限
  });
}
