import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { cacheGet, cacheSet, progressListCacheKey } from "@/lib/cache";

const PROGRESS_LIST_TTL = 30;

export async function GET() {
  let userId: number | null;
  try {
    userId = await getSessionUserId();
  } catch {
    return NextResponse.json({}, { status: 401 });
  }
  if (userId == null) {
    return NextResponse.json({}, { status: 401 });
  }
  const key = progressListCacheKey(userId);
  let cached: Array<{ jobId: string; company: string; industry: string; type: string; status: string; note?: string }> | null = null;
  try {
    cached = await cacheGet<Array<{ jobId: string; company: string; industry: string; type: string; status: string; note?: string }>>(key);
  } catch {
    // 缓存读取失败，继续查库
  }
  if (cached) {
    return NextResponse.json(cached);
  }
  try {
    const list = await prisma.userJobStatus.findMany({
      where: { userId },
      select: { jobId: true, status: true, note: true },
    });
    const jobIds = [...new Set(list.map((l) => l.jobId))];
    if (jobIds.length === 0) {
      const empty: Array<{ jobId: string; company: string; industry: string; type: string; status: string; note?: string }> = [];
      try {
        await cacheSet(key, empty, PROGRESS_LIST_TTL);
      } catch {
        /* ignore */
      }
      return NextResponse.json([]);
    }
    const jobs = await prisma.job.findMany({
      where: { id: { in: jobIds } },
      select: { id: true, company: true, industry: true, recruitType: true },
    });
    const jobMap = new Map(jobs.map((j) => [Number(j.id), j]));
    const items = list.map((l) => {
      const job = jobMap.get(Number(l.jobId));
      return {
        jobId: String(l.jobId),
        company: job?.company ?? "",
        industry: job?.industry ?? "",
        type: job?.recruitType ?? "",
        status: l.status,
        note: l.note ?? undefined,
      };
    });
    try {
      await cacheSet(key, items, PROGRESS_LIST_TTL);
    } catch {
      /* ignore */
    }
    return NextResponse.json(items);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[progress/list]", err.message, err.stack);
    return NextResponse.json({ message: "服务器错误" }, { status: 500 });
  }
}
