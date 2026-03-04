import crypto from "crypto";
import { getRedis } from "./redis";

type CacheEntry = { value: unknown; expiresAt: number };

declare global {
   
  var __campusRecruitMemCache: Map<string, CacheEntry> | undefined;
}

function memCache(): Map<string, CacheEntry> {
  if (!globalThis.__campusRecruitMemCache) globalThis.__campusRecruitMemCache = new Map();
  return globalThis.__campusRecruitMemCache;
}

export function cacheKey(prefix: string, obj: unknown): string {
  const json = JSON.stringify(obj);
  const hash = crypto.createHash("sha1").update(json).digest("hex");
  return `cr:${prefix}:${hash}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const v = await redis.get(key);
      if (!v) return null;
      // 兼容 ioredis 返回 string，或其他库返回已解析的对象
      if (typeof v === "string") return JSON.parse(v) as T;
      return v as T;
    } catch {
      // Redis 不可用时降级到内存缓存
    }
  }
  const entry = memCache().get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memCache().delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), "EX", Math.max(1, ttlSeconds));
      return;
    } catch {
      // ignore and fallback
    }
  }
  memCache().set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(key);
      return;
    } catch {
      // ignore
    }
  }
  memCache().delete(key);
}

const PROGRESS_LIST_PREFIX = "cr:progress:list:";

export function progressListCacheKey(userId: number): string {
  return `${PROGRESS_LIST_PREFIX}${userId}`;
}

export async function invalidateProgressListCache(userId: number): Promise<void> {
  await cacheDelete(progressListCacheKey(userId));
}

const AUTH_CURRENT_PREFIX = "cr:auth:current:";

export function authCurrentCacheKey(userId: number): string {
  return `${AUTH_CURRENT_PREFIX}${userId}`;
}

export async function invalidateAuthCurrentCache(userId: number): Promise<void> {
  await cacheDelete(authCurrentCacheKey(userId));
}

