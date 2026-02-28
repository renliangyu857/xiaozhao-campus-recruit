import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { invalidateProgressListCache } from "@/lib/cache";

const VALID_STATUSES = ["未投递", "已投递", "已笔试", "已面试", "已通过", "已挂"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }
  const { jobId } = await params;
  const jobIdNum = parseInt(jobId, 10);
  if (isNaN(jobIdNum)) {
    return NextResponse.json({ message: "职位不存在或状态值无效" }, { status: 400 });
  }
  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "职位不存在或状态值无效" }, { status: 400 });
  }
  const status = body?.status;
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ message: "职位不存在或状态值无效" }, { status: 400 });
  }
  const job = await prisma.job.findUnique({ where: { id: jobIdNum } });
  if (!job) {
    return NextResponse.json({ message: "职位不存在或状态值无效" }, { status: 400 });
  }
  const userIdBigInt = BigInt(userId);
  const jobIdBigInt = BigInt(jobIdNum);
  try {
    await prisma.userJobStatus.upsert({
      where: {
        userId_jobId: { userId: userIdBigInt, jobId: jobIdBigInt },
      },
      create: { userId: userIdBigInt, jobId: jobIdBigInt, status },
      update: { status },
    });
  } catch (e) {
    console.error("[jobs/status] upsert failed", e);
    return NextResponse.json({ message: "更新失败" }, { status: 500 });
  }
  try {
    await invalidateProgressListCache(userId);
  } catch {
    // 缓存失效失败不影响主流程
  }
  return NextResponse.json({ message: "已更新" });
}
