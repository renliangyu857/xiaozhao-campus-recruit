/**
 * API 防护中间件
 * 集成签名验证和频率限制
 */

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { verifySignature, getRequestPath } from "./api-sign";
import { getUserApiSecret } from "./session";

// Redis 实例
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || "",
  token: process.env.UPSTASH_REDIS_TOKEN || "",
});

// 频率限制配置
const RATE_LIMIT_CONFIG = {
  // 职位列表查询：每分钟 20 次
  jobList: { window: 60, max: 20 },
  // 职位详情：每分钟 30 次
  jobDetail: { window: 60, max: 30 },
  // 默认：每分钟 30 次
  default: { window: 60, max: 30 },
};

/**
 * 获取频率限制配置
 */
function getRateLimitConfig(path: string): { window: number; max: number } {
  if (path.includes("/api/jobs") && !path.includes("/")) {
    return RATE_LIMIT_CONFIG.jobList;
  }
  if (path.match(/\/api\/jobs\/\d+/)) {
    return RATE_LIMIT_CONFIG.jobDetail;
  }
  return RATE_LIMIT_CONFIG.default;
}

/**
 * 检查频率限制
 * 使用滑动窗口算法
 */
export async function checkRateLimit(
  userId: string,
  path: string
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const config = getRateLimitConfig(path);
  const key = `rate_limit:${userId}:${path}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.window;

  try {
    // 获取当前窗口内的请求次数
    const requests = await redis.zrange(key, windowStart, now, {
      byScore: true,
    });

    const current = requests.length;

    if (current >= config.max) {
      // 获取最早请求的过期时间
      const oldest = await redis.zrange(key, 0, 0, { withScores: true });
      const resetTime = oldest.length > 0 ? Math.floor(oldest[0].score) + config.window : now + config.window;

      return {
        allowed: false,
        remaining: 0,
        reset: resetTime,
      };
    }

    // 记录本次请求
    await redis.zadd(key, { score: now, member: `${now}:${Math.random()}` });
    // 设置过期时间
    await redis.expire(key, config.window);

    return {
      allowed: true,
      remaining: config.max - current - 1,
      reset: now + config.window,
    };
  } catch (error) {
    console.error("[RateLimit] Error:", error);
    // Redis 失败时允许请求通过（避免阻塞正常用户）
    return { allowed: true, remaining: 1, reset: now + config.window };
  }
}

/**
 * 验证 API 请求签名（异步版本，需要 userSecret）
 */
export async function validateApiSignature(
  request: NextRequest,
  userId: string,
  userSecret: string
): Promise<{ valid: boolean; error?: string }> {
  // 从 header 获取签名参数
  const timestamp = parseInt(request.headers.get("x-timestamp") || "0");
  const nonce = request.headers.get("x-nonce") || "";
  const signature = request.headers.get("x-signature") || "";

  if (!timestamp || !nonce || !signature) {
    return { valid: false, error: "Missing signature headers" };
  }

  const path = getRequestPath(request.url);

  return verifySignature(
    signature,
    timestamp,
    nonce,
    path,
    userId,
    userSecret
  );
}

/**
 * API 防护中间件
 * 组合签名验证 + 频率限制
 */
export async function apiProtectionMiddleware(
  request: NextRequest,
  userId: string
): Promise<
  | { success: true }
  | { success: false; response: NextResponse }
> {
  // 1. 获取用户的 API secret
  const userSecret = await getUserApiSecret();
  if (!userSecret) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "API secret not found", code: "NO_API_SECRET" },
        { status: 403 }
      ),
    };
  }

  // 2. 验证签名
  const signCheck = await validateApiSignature(request, userId, userSecret);
  if (!signCheck.valid) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid request signature", code: "INVALID_SIGNATURE" },
        { status: 403 }
      ),
    };
  }

  // 3. 检查频率限制
  const path = getRequestPath(request.url);
  const rateLimit = await checkRateLimit(userId, path);

  if (!rateLimit.allowed) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Rate limit exceeded",
          code: "RATE_LIMITED",
          resetAt: rateLimit.reset,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(RATE_LIMIT_CONFIG.jobList.max),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimit.reset),
          },
        }
      ),
    };
  }

  return { success: true };
}

/**
 * 创建带防护的 API 响应
 * 自动添加防护相关的响应头
 */
export function createProtectedResponse(
  data: unknown,
  rateLimitInfo: { remaining: number; reset: number },
  path: string
): NextResponse {
  const config = getRateLimitConfig(path);

  return NextResponse.json(data, {
    headers: {
      "X-RateLimit-Limit": String(config.max),
      "X-RateLimit-Remaining": String(rateLimitInfo.remaining),
      "X-RateLimit-Reset": String(rateLimitInfo.reset),
    },
  });
}
