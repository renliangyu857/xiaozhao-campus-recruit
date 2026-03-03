/**
 * 微信扫码登录票据管理（用于 PC 端轮询登录）
 * 使用 Redis/内存存储票据状态
 */

import { Redis } from "@upstash/redis";

// 票据有效期（10分钟）
const TICKET_EXPIRY = 10 * 60;

// 登录状态
export type LoginTicketStatus =
  | "pending" // 等待扫码
  | "scanned" // 已扫码
  | "success" // 登录成功
  | "expired" // 已过期
  | "cancelled"; // 用户取消

export interface LoginTicket {
  ticket: string;
  status: LoginTicketStatus;
  userId?: string;
  openid?: string;
  createdAt: number;
  scannedAt?: number;
}

// 优先使用 Upstash Redis，否则使用内存存储（仅开发环境）
// 注意：@upstash/redis 需要 REST API URL（https://开头），不是 redis:// 连接字符串
const redisUrl = process.env.UPSTASH_REDIS_URL || "";
const redisToken = process.env.UPSTASH_REDIS_TOKEN || "";

// 检查是否是有效的 Upstash REST URL（必须以 https:// 开头）
const isValidUpstashUrl = redisUrl.startsWith("https://");

const redis = isValidUpstashUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

// 内存存储（仅用于开发环境）
const memoryStore = new Map<string, LoginTicket>();

function getKey(ticket: string): string {
  return `wechat_login:ticket:${ticket}`;
}

/**
 * 创建登录票据
 */
export async function createLoginTicket(): Promise<LoginTicket> {
  const ticket = `wlt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const data: LoginTicket = {
    ticket,
    status: "pending",
    createdAt: Date.now(),
  };

  if (redis) {
    await redis.setex(getKey(ticket), TICKET_EXPIRY, JSON.stringify(data));
  } else {
    memoryStore.set(ticket, data);
    // 设置过期清理
    setTimeout(() => {
      memoryStore.delete(ticket);
    }, TICKET_EXPIRY * 1000);
  }

  return data;
}

/**
 * 获取票据状态
 */
export async function getLoginTicket(ticket: string): Promise<LoginTicket | null> {
  if (redis) {
    const data = await redis.get<string>(getKey(ticket));
    return data ? JSON.parse(data) : null;
  }
  return memoryStore.get(ticket) || null;
}

/**
 * 更新票据状态为已扫码
 */
export async function markTicketScanned(ticket: string, openid: string): Promise<boolean> {
  const data = await getLoginTicket(ticket);
  if (!data || data.status !== "pending") return false;

  const updated: LoginTicket = {
    ...data,
    status: "scanned",
    openid,
    scannedAt: Date.now(),
  };

  if (redis) {
    // 重新设置过期时间，给用户更多时间确认
    const remainingTtl = Math.max(60, TICKET_EXPIRY - (Date.now() - data.createdAt) / 1000);
    await redis.setex(getKey(ticket), Math.floor(remainingTtl), JSON.stringify(updated));
  } else {
    memoryStore.set(ticket, updated);
  }

  return true;
}

/**
 * 更新票据状态为登录成功
 */
export async function markTicketSuccess(
  ticket: string,
  userId: string
): Promise<boolean> {
  const data = await getLoginTicket(ticket);
  if (!data || (data.status !== "pending" && data.status !== "scanned")) {
    return false;
  }

  const updated: LoginTicket = {
    ...data,
    status: "success",
    userId,
  };

  if (redis) {
    // 成功后保留较短时间供轮询获取
    await redis.setex(getKey(ticket), 60, JSON.stringify(updated));
  } else {
    memoryStore.set(ticket, updated);
    setTimeout(() => memoryStore.delete(ticket), 60 * 1000);
  }

  return true;
}

/**
 * 取消登录
 */
export async function cancelLoginTicket(ticket: string): Promise<boolean> {
  const data = await getLoginTicket(ticket);
  if (!data) return false;

  const updated: LoginTicket = {
    ...data,
    status: "cancelled",
  };

  if (redis) {
    await redis.setex(getKey(ticket), 60, JSON.stringify(updated));
  } else {
    memoryStore.set(ticket, updated);
    setTimeout(() => memoryStore.delete(ticket), 60 * 1000);
  }

  return true;
}

/**
 * 清理过期票据
 */
export async function cleanupExpiredTickets(): Promise<void> {
  if (!redis) {
    // 内存模式自动清理，无需额外操作
    return;
  }
  // Redis 自动过期，无需手动清理
}
