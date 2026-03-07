/**
 * 客户端 API 请求签名
 * 用于在请求 API 时附加签名，防止 F12 抓包直调
 */

// 从 session 中获取用户的 API secret
let userApiSecret: string | null = null;

/**
 * 获取或初始化用户的 API 签名密钥
 * 登录后由后端通过 session 或接口返回
 */
export function setUserApiSecret(secret: string): void {
  userApiSecret = secret;
  // 同时存储到 sessionStorage，刷新页面后可用
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("api_secret", secret);
  }
}

/**
 * 从 cookie 中获取 API secret
 */
function getApiSecretFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/campus_api_secret=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * 获取用户的 API 签名密钥
 */
export function getUserApiSecret(): string | null {
  if (userApiSecret) return userApiSecret;

  // 优先从 cookie 读取（后端设置）
  const cookieSecret = getApiSecretFromCookie();
  if (cookieSecret) return cookieSecret;

  // 兼容 sessionStorage
  if (typeof sessionStorage !== "undefined") {
    return sessionStorage.getItem("api_secret");
  }
  return null;
}

/**
 * 清除用户的 API 签名密钥（退出登录时调用）
 */
export function clearUserApiSecret(): void {
  userApiSecret = null;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("api_secret");
  }
}

/**
 * 生成随机 nonce
 */
function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * 简单的 SHA256 实现（客户端不需要 crypto 库）
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 从 API secret 解析 userId
 * 格式: userId:randomSecret
 */
export function parseUserIdFromSecret(secret: string): number | null {
  const parts = secret.split(":");
  if (parts.length >= 2) {
    const userId = parseInt(parts[0], 10);
    return isNaN(userId) ? null : userId;
  }
  return null;
}

/**
 * 生成请求签名
 */
async function generateSignature(
  path: string,
  timestamp: number,
  nonce: string,
  userId: number,
  secret: string
): Promise<string> {
  const data = `${path}:${timestamp}:${nonce}:${userId}:${secret}`;
  return sha256(data);
}

/**
 * 创建带签名的 fetch 请求
 * 自动添加必要的请求头
 */
export async function signedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const secret = getUserApiSecret();
  if (!secret) {
    // 如果没有 secret，尝试普通请求（后端会返回 403）
    console.warn("[ApiSign] No API secret found, request may fail");
    return fetch(url, options);
  }

  const urlObj = new URL(url, window.location.origin);
  const path = urlObj.pathname;
  const timestamp = Date.now();
  const nonce = generateNonce();
  const userId = parseUserIdFromSecret(secret);

  if (!userId) {
    console.error("[ApiSign] Failed to parse userId from secret");
    return fetch(url, options);
  }

  const signature = await generateSignature(path, timestamp, nonce, userId, secret);

  // 合并请求头
  const headers = new Headers(options.headers);
  headers.set("X-Timestamp", timestamp.toString());
  headers.set("X-Nonce", nonce);
  headers.set("X-Signature", signature);

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * 带签名的 fetch 封装，支持自动重试
 */
export async function protectedFetch<T>(
  url: string,
  options?: RequestInit,
  retryCount = 0
): Promise<T> {
  const response = await signedFetch(url, options);

  // 处理 API Secret 初始化（兼容老用户）
  if (response.status === 401) {
    const error = await response.json().catch(() => ({ error: "Unauthorized" }));
    if (error.code === "API_SECRET_INIT" && error.retry && retryCount < 2) {
      // 等待 Cookie 设置完成
      await new Promise(resolve => setTimeout(resolve, 500));
      // 重新获取 secret 并重试
      const newSecret = getUserApiSecret();
      if (newSecret) {
        return protectedFetch(url, options, retryCount + 1);
      }
    }
    throw new Error(error.error || "请先登录");
  }

  if (response.status === 403) {
    const error = await response.json().catch(() => ({ error: "Forbidden" }));
    if (error.code === "INVALID_SIGNATURE") {
      throw new Error("API 签名验证失败，请刷新页面后重试");
    }
    throw new Error(error.error || "请求被拒绝");
  }

  if (response.status === 429) {
    const error = await response.json().catch(() => ({ error: "Rate limited" }));
    throw new Error(`请求过于频繁，请${error.resetAt ? Math.ceil((error.resetAt * 1000 - Date.now()) / 1000) : 60}秒后再试`);
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }

  return response.json();
}
