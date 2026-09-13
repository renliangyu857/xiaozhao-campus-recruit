/**
 * 公众号验证码登录：验证码存储
 *
 * 流程：用户在公众号发送「登录」→ 生成 6 位码并绑定其 openid（5 分钟有效、一次性消费）
 * → 用户在网页输入验证码 → 后端用码换 openid 完成登录。
 *
 * 存储优先 Upstash Redis（Vercel 多实例安全），不可用时退化为进程内存（仅本地开发）。
 * 同一 openid 60 秒冷却内重复取码会拿到同一个码，防止刷码。
 */

import { Redis } from "@upstash/redis";

const CODE_EXPIRY = 5 * 60; // 验证码有效期（秒）
const RESEND_COOLDOWN = 60; // 同一 openid 重复取码冷却（秒）

const redisUrl = process.env.UPSTASH_REDIS_URL || "";
const redisToken = process.env.UPSTASH_REDIS_TOKEN || "";

const redis =
  redisUrl.startsWith("https://") && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

// 内存兜底（仅本地开发 / Redis 未配置时）
const memCode = new Map<string, { openid: string; expiresAt: number }>();
const memOpen = new Map<string, { code: string; expiresAt: number }>();

function codeKey(code: string): string {
  return `mplogin:code:${code}`;
}

function openKey(openid: string): string {
  return `mplogin:open:${openid}`;
}

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 为 openid 生成登录验证码；60 秒冷却内重复请求返回同一个码
 */
export async function createLoginCode(openid: string): Promise<string> {
  if (redis) {
    const existing = await redis.get<string>(openKey(openid));
    if (existing) {
      return typeof existing === "string" ? existing : String(existing);
    }
    // 撞码检查：极小概率 6 位码已被占用，重试换码
    let code = genCode();
    for (let i = 0; i < 3; i++) {
      const exists = await redis.exists(codeKey(code));
      if (!exists) break;
      code = genCode();
    }
    await redis.setex(codeKey(code), CODE_EXPIRY, openid);
    await redis.setex(openKey(openid), RESEND_COOLDOWN, code);
    return code;
  }

  const now = Date.now();
  const m = memOpen.get(openid);
  if (m && now < m.expiresAt) return m.code;
  const code = genCode();
  memCode.set(code, { openid, expiresAt: now + CODE_EXPIRY * 1000 });
  memOpen.set(openid, { code, expiresAt: now + RESEND_COOLDOWN * 1000 });
  return code;
}

/**
 * 消费验证码：有效则返回绑定的 openid 并立即作废（一次性），无效返回 null
 */
export async function consumeLoginCode(code: string): Promise<string | null> {
  if (redis) {
    const openid = await redis.get<string>(codeKey(code));
    if (!openid) return null;
    await redis.del(codeKey(code));
    const normalized = typeof openid === "string" ? openid : String(openid);
    await redis.del(openKey(normalized));
    return normalized;
  }

  const m = memCode.get(code);
  if (!m || Date.now() >= m.expiresAt) {
    memCode.delete(code);
    return null;
  }
  memCode.delete(code);
  memOpen.delete(m.openid);
  return m.openid;
}
