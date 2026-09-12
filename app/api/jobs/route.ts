import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { cacheGet, cacheKey, cacheSet } from "@/lib/cache";
import { apiProtectionMiddleware } from "@/lib/api-protection";
import { mixWithHoneyJobs } from "@/lib/honeytoken";

function parseJsonArray(s: string | null | undefined): string[] {
  if (!s || !s.trim()) return [];
  const t = s.trim().replace(/^\[|\]$/g, "").trim();
  if (!t) return [];
  return t.split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
}

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录后操作" }, { status: 401 });
  }

  // API 防护：签名验证 + 频率限制
  const protection = await apiProtectionMiddleware(request, String(userId));
  if (!protection.success) {
    return protection.response;
  }
  // 如果自动发放了 API Secret，直接返回（客户端会重试）
  if (protection.response) {
    return protection.response;
  }

  const { searchParams } = request.nextUrl;
  const industry = searchParams.get("industry") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const location = searchParams.get("location") ?? undefined;
  const deadlineDays = searchParams.get("deadlineDays") ?? undefined;
  const roles = searchParams.get("roles") ?? undefined;
  const onlyNewToday = searchParams.get("onlyNewToday") === "true";
  const hideExpired = searchParams.get("hideExpired") === "true";
  const includeTotal = searchParams.get("includeTotal") === "true";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const size = Math.min(100, Math.max(1, parseInt(searchParams.get("size") ?? "20", 10)));

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const where: Record<string, unknown> = {};
  const conditions: Prisma.JobWhereInput[] = [];

  if (industry && industry !== "ALL") {
    conditions.push({ industry });
  }

  if (type && type !== "ALL") {
    // 根据类型匹配届数（只判断recruitType字段）
    // 春招/秋招 → 26届
    // 实习 → 27届或更迟
    // 其他 → 25届或更早
    // 海外 → 海外应届
    // 部分 → 部分应届

    let typeCondition;
    if (type === "秋招" || type === "春招") {
      // 26届：recruitType包含"26届"
      typeCondition = { recruitType: { contains: "26届" } };
    } else if (type === "实习") {
      // 27届或更迟：recruitType包含"27届"或更迟
      typeCondition = {
        OR: [
          { recruitType: { contains: "27届" } },
          { recruitType: { contains: "28届" } },
          { recruitType: { contains: "29届" } },
          { recruitType: { contains: "30届" } },
          { recruitType: { contains: "更迟" } }
        ]
      };
    } else if (type === "其他") {
      // 25届或更早：recruitType包含"25届"或更早
      typeCondition = {
        OR: [
          { recruitType: { contains: "25届" } },
          { recruitType: { contains: "24届" } },
          { recruitType: { contains: "23届" } },
          { recruitType: { contains: "22届" } },
          { recruitType: { contains: "21届" } },
          { recruitType: { contains: "20届" } },
          { recruitType: { contains: "更早" } }
        ]
      };
    } else if (type === "海外") {
      // 海外应届：recruitType包含"海外应届"
      typeCondition = { recruitType: { contains: "海外应届" } };
    } else if (type === "部分") {
      // 部分应届：recruitType包含"部分应届"
      typeCondition = { recruitType: { contains: "部分应届" } };
    }

    if (typeCondition) {
      conditions.push(typeCondition);
    }
  }

  if (location && location.trim()) {
    conditions.push({ locations: { contains: location.trim() } });
  }

  if (deadlineDays && deadlineDays !== "ALL") {
    const days = parseInt(deadlineDays, 10);
    if (!isNaN(days)) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      const targetDate = d.toISOString().slice(0, 10);
      const todayStr = now.toISOString().slice(0, 10);

      // 截止日期筛选：包含有效的日期格式或"招满即止"
      conditions.push({
        OR: [
          {
            endDate: {
              gte: todayStr,
              lte: targetDate
            }
          },
          { endDate: "招满即止" }
        ]
      });
    }
  }

  if (roles && roles.trim()) {
    conditions.push({ roles: { contains: roles.trim() } });
  }

  if (onlyNewToday) {
    conditions.push({ createdAt: { gte: todayStart } });
  }

  if (hideExpired) {
    conditions.push({
      OR: [
        { endDate: null },
        { endDate: "招满即止" },
        { endDate: { gte: now.toISOString().slice(0, 10) } }
      ]
    });
  }

  if (conditions.length > 0) {
    where.AND = conditions;
  }

  const whereKey = cacheKey("jobs:where:v3", {
    industry: industry && industry !== "ALL" ? industry : null,
    type: type && type !== "ALL" ? type : null,
    location: location?.trim() || null,
    deadlineDays: deadlineDays && deadlineDays !== "ALL" ? deadlineDays : null,
    roles: roles?.trim() || null,
    onlyNewToday,
    hideExpired,
  });
  const listKey = `${whereKey}:p${page}:s${size}`;
  const countKey = `${whereKey}:count`;

  type JobRow = {
    id: bigint;
    company: string;
    industry: string;
    recruitType: string;
    locations: string | null;
    startDate: string | null;
    endDate: string | null;
    noWrittenTest: string;
    roles: string | null;
    announcementLink: string | null;
    applyLink: string | null;
    remark: string | null;
    batch: string | null;
    salary: string | null;
    createdAt: Date;
  };

  type CachedRow = Omit<JobRow, "id" | "createdAt"> & { id: string; createdAt: string };

  const cachedList = await cacheGet<{ rows: CachedRow[]; hasNext: boolean }>(listKey);
  let rows: JobRow[];
  let hasNext: boolean;
  if (cachedList) {
    rows = cachedList.rows.map((r) => ({
      ...r,
      id: BigInt(r.id),
      createdAt: new Date(r.createdAt),
    })) as unknown as JobRow[];
    hasNext = cachedList.hasNext;
  } else {
    const take = size + 1;
    const fetched = await prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * size,
      take,
      select: {
        id: true,
        company: true,
        industry: true,
        recruitType: true,
        locations: true,
        startDate: true,
        endDate: true,
        noWrittenTest: true,
        roles: true,
        announcementLink: true,
        applyLink: true,
        remark: true,
        batch: true,
        salary: true,
        createdAt: true,
      },
    });
    hasNext = fetched.length > size;
    rows = (hasNext ? fetched.slice(0, size) : fetched) as unknown as JobRow[];
    const toCache: CachedRow[] = rows.map((j) => ({
      ...j,
      id: String(j.id),
      createdAt: j.createdAt.toISOString(),
    }));
    await cacheSet(listKey, { rows: toCache, hasNext }, 60);
  }

  let totalElements: number | null = await cacheGet<number>(countKey);
  if (includeTotal && totalElements == null) {
    totalElements = await prisma.job.count({ where });
    await cacheSet(countKey, totalElements, 300);
  }

  const jobIds = rows.map((j) => (typeof j.id === "bigint" ? j.id : BigInt(j.id)));
  const statusMap =
    jobIds.length === 0
      ? new Map<string, string>()
      : await prisma.userJobStatus
          .findMany({
            where: { userId, jobId: { in: jobIds } },
            select: { jobId: true, status: true },
          })
          .then((list) => new Map(list.map((s) => [String(s.jobId), s.status])));

  const content = rows.map((job) => {
    const status = statusMap.get(String(job.id)) ?? "未投递";
    const isNewToday = job.createdAt >= todayStart;
    return {
      id: String(job.id),
      company: job.company,
      industry: job.industry,
      type: job.recruitType,
      locations: parseJsonArray(job.locations),
      status,
      startDate: job.startDate,
      endDate: job.endDate,
      noWrittenTest: job.noWrittenTest === "true" || job.noWrittenTest === "1",
      roles: parseJsonArray(job.roles),
      announcementLink: job.announcementLink ?? "",
      applyLink: job.applyLink ?? "",
      remark: job.remark ?? "",
      batch: job.batch ?? "",
      salary: job.salary ?? "",
      isNew: isNewToday,
    };
  });

  // 混入蜜罐职位（用于溯源）
  const contentWithHoney = mixWithHoneyJobs(content, String(userId));

  return NextResponse.json({
    content: contentWithHoney,
    totalElements,
    totalPages: typeof totalElements === "number" ? Math.ceil(totalElements / size) : null,
    size,
    number: page,
    hasNext,
  });
}
