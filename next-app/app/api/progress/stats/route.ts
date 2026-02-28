import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({
      byStatus: {},
      totalApplied: 0,
      byIndustry: [],
    });
  }
  const statuses = await prisma.userJobStatus.findMany({
    where: { userId },
    select: { status: true },
  });
  const byStatus: Record<string, number> = {};
  for (const s of statuses) {
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
  }
  const totalApplied = statuses.filter((s) => s.status !== "未投递").length;
  const ujs = await prisma.userJobStatus.findMany({
    where: { userId },
    select: { jobId: true },
  });
  const jobs = await prisma.job.findMany({
    where: { id: { in: ujs.map((x) => x.jobId) } },
    select: { industry: true },
  });
  const industryCount: Record<string, number> = {};
  for (const j of jobs) {
    industryCount[j.industry] = (industryCount[j.industry] ?? 0) + 1;
  }
  const byIndustry = Object.entries(industryCount).map(([industry, count]) => ({ industry, count }));
  return NextResponse.json({
    byStatus,
    totalApplied,
    byIndustry,
  });
}
