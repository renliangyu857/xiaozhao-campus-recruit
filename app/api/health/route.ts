import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 健康检查：供负载均衡/平台探活。
 * GET /api/health
 * 可选查询参数：check=db 或 check=redis 会检测连通性；默认仅返回 200。
 */
export async function GET(request: NextRequest) {
  const check = request.nextUrl.searchParams.get("check") ?? "";
  const checks: Record<string, "ok" | "error"> = {};
  let status: number = 200;

  if (!check || check === "db") {
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = "ok";
    } catch {
      checks.db = "error";
      status = 503;
    }
  }

  if (!check || check === "redis") {
    const redis = getRedis();
    if (!redis) {
      checks.redis = "ok"; // 未配置 Redis 视为可用（有降级）
    } else {
      try {
        await redis.ping();
        checks.redis = "ok";
      } catch {
        checks.redis = "error";
        // Redis 非必须，仅记录不拉垮健康状态
        if (status !== 503) status = 200;
      }
    }
  }

  return NextResponse.json(
    {
      status: status === 200 ? "ok" : "degraded",
      ...(Object.keys(checks).length > 0 ? { checks } : {}),
    },
    { status }
  );
}
