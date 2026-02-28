import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { invalidateProgressListCache } from "@/lib/cache";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  let userId: number | null;
  try {
    userId = await getSessionUserId();
  } catch {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }
  const { jobId } = await params;
  const jobIdNum = parseInt(jobId, 10);
  if (isNaN(jobIdNum) || jobIdNum < 0) {
    return NextResponse.json({ message: "更新失败" }, { status: 400 });
  }
  const jobIdBigInt = BigInt(jobIdNum);
  let body: { note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "更新失败" }, { status: 400 });
  }
  const note = body?.note ?? "";
  try {
    const existing = await prisma.userJobStatus.findUnique({
      where: { userId_jobId: { userId, jobId: jobIdBigInt } },
    });
    if (!existing) {
      return NextResponse.json({ message: "更新失败" }, { status: 400 });
    }
    await prisma.userJobStatus.update({
      where: { userId_jobId: { userId, jobId: jobIdBigInt } },
      data: { note },
    });
    await invalidateProgressListCache(userId);
    return NextResponse.json({ message: "已更新" });
  } catch (e) {
    console.error("[progress/note]", e);
    return NextResponse.json({ message: "更新失败" }, { status: 400 });
  }
}
