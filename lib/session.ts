import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";

const COOKIE_NAME = "campus_session";
const API_SECRET_COOKIE = "campus_api_secret";
const DEV_SECRET = "dev-secret-change-in-production";
const SECRET = process.env.SESSION_SECRET || DEV_SECRET;

if (process.env.NODE_ENV === "production" && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === DEV_SECRET)) {
  // 生产环境必须显式设置强 SESSION_SECRET
  console.error("[session] SESSION_SECRET must be set to a strong random value in production (e.g. openssl rand -base64 32)");
}

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export async function getSessionUserId(): Promise<number | null> {
  const c = await cookies();
  const raw = c.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  if (!timingSafeEqual(Buffer.from(sign(payload), "hex"), Buffer.from(sig, "hex"))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data.userId === "number" ? data.userId : null;
  } catch {
    return null;
  }
}

export async function setSessionUserId(userId: number): Promise<void> {
  const payload = Buffer.from(JSON.stringify({ userId })).toString("base64url");
  const sig = sign(payload);
  const c = await cookies();
  c.set(COOKIE_NAME, `${payload}.${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
  c.delete(API_SECRET_COOKIE);
}

/**
 * 生成用户的 API 签名密钥
 * 格式: userId:randomSecret (便于前端解析 userId)
 */
function generateApiSecret(userId: number): string {
  const random = randomBytes(16).toString("hex");
  return `${userId}:${random}`;
}

/**
 * 获取用户的 API 签名密钥
 */
export async function getUserApiSecret(): Promise<string | null> {
  const c = await cookies();
  return c.get(API_SECRET_COOKIE)?.value || null;
}

/**
 * 设置用户的 API 签名密钥（登录时调用）
 * 格式: userId:secret
 */
export async function setUserApiSecret(userId: number): Promise<string> {
  const secret = generateApiSecret(userId);
  const c = await cookies();
  c.set(API_SECRET_COOKIE, secret, {
    httpOnly: false, // 前端需要读取用于签名
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return secret;
}

/**
 * 获取当前登录用户的 ID
 */
export async function getSessionUserIdOnly(): Promise<number | null> {
  const c = await cookies();
  const raw = c.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const [payload] = raw.split(".");
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data.userId === "number" ? data.userId : null;
  } catch {
    return null;
  }
}
