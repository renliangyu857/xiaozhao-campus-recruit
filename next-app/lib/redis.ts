import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __campusRecruitRedis: Redis | null | undefined;
}

export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) return null;
  if (globalThis.__campusRecruitRedis !== undefined) return globalThis.__campusRecruitRedis;

  const client = new Redis(url, {
    // Upstash 连接可能跨区，避免无限重试拖慢请求
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  globalThis.__campusRecruitRedis = client;
  return client;
}

