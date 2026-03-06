/**
 * API 请求签名验证
 * 防止 F12 抓包后直接 curl 调用接口
 */

import { createHash, randomBytes } from "crypto";

// 签名有效期（秒）
const SIGNATURE_EXPIRY = 60;

export interface SignParams {
  timestamp: number;
  nonce: string;
  path: string;
  userId: string;
}

/**
 * 生成请求签名
 * 前后端使用相同的用户专属 secret
 */
export function generateSignature(params: SignParams, secret: string): string {
  const { timestamp, nonce, path, userId } = params;
  const data = `${path}:${timestamp}:${nonce}:${userId}:${secret}`;
  return createHash("sha256").update(data).digest("hex");
}

/**
 * 生成随机 nonce
 */
export function generateNonce(): string {
  return randomBytes(8).toString("hex");
}

/**
 * 验证请求签名
 * @returns 验证结果和解析后的参数
 */
export function verifySignature(
  signature: string,
  timestamp: number,
  nonce: string,
  path: string,
  userId: string,
  secret: string
): { valid: boolean; error?: string } {
  // 1. 检查时间戳是否在有效期内
  const now = Date.now();
  const requestTime = timestamp;

  if (Math.abs(now - requestTime) > SIGNATURE_EXPIRY * 1000) {
    return { valid: false, error: "Signature expired" };
  }

  // 2. 验证签名
  const expectedSignature = generateSignature(
    { timestamp, nonce, path, userId },
    secret
  );

  if (!timingSafeEqual(signature, expectedSignature)) {
    return { valid: false, error: "Invalid signature" };
  }

  return { valid: true };
}

/**
 * 时间安全比较（防止时序攻击）
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * 获取当前请求的路径（不含 query）
 */
export function getRequestPath(url: string): string {
  const urlObj = new URL(url);
  return urlObj.pathname;
}
