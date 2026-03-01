/**
 * 限流：基于 Redis 或内存，按 key（如 IP、userId）在时间窗口内限制请求次数。
 * 用于登录、消耗次数、下单等接口防刷。
 */

import { getRedis } from "./redis";

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitMem: Map<string, { count: number; resetAt: number }> | undefined;
}

function memStore(): Map<string, { count: number; resetAt: number }> {
  if (!globalThis.__rateLimitMem) globalThis.__rateLimitMem = new Map();
  return globalThis.__rateLimitMem;
}

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

/**
 * 检查是否允许通过，若允许则增加计数。
 * @param key 限流键（如 ip:xxx 或 user:123）
 * @param windowSeconds 时间窗口（秒）
 * @param maxPerWindow 窗口内最大请求数
 */
export async function rateLimitCheck(
  key: string,
  windowSeconds: number,
  maxPerWindow: number
): Promise<RateLimitResult> {
  const fullKey = `rl:${key}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;

  const redis = getRedis();
  if (redis) {
    try {
      await redis.zremrangebyscore(fullKey, 0, windowStart);
      const count = await redis.zcard(fullKey);
      if (count >= maxPerWindow) {
        const ttl = await redis.pttl(fullKey);
        return {
          allowed: false,
          remaining: 0,
          resetAt: ttl > 0 ? now + Math.ceil(ttl / 1000) : now + windowSeconds,
        };
      }
      await redis.zadd(fullKey, now, `${now}-${Math.random()}`);
      await redis.expire(fullKey, windowSeconds + 1);
      return {
        allowed: true,
        remaining: maxPerWindow - count - 1,
        resetAt: now + windowSeconds,
      };
    } catch {
      // Redis 不可用时降级到内存
    }
  }

  const store = memStore();
  const entry = store.get(fullKey);
  if (!entry) {
    store.set(fullKey, { count: 1, resetAt: Date.now() + windowSeconds * 1000 });
    return { allowed: true, remaining: maxPerWindow - 1, resetAt: now + windowSeconds };
  }
  if (Date.now() > entry.resetAt) {
    store.set(fullKey, { count: 1, resetAt: Date.now() + windowSeconds * 1000 });
    return { allowed: true, remaining: maxPerWindow - 1, resetAt: now + windowSeconds };
  }
  if (entry.count >= maxPerWindow) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.ceil(entry.resetAt / 1000),
    };
  }
  entry.count += 1;
  return {
    allowed: true,
    remaining: maxPerWindow - entry.count,
    resetAt: Math.ceil(entry.resetAt / 1000),
  };
}

/** 从请求中解析客户端 IP（兼容 Vercel / 代理） */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}
