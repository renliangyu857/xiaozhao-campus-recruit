import { apiFetch } from "./apiClient";
import type { User } from "./types";

const CACHE_TTL_MS = 60_000;
let cachedUser: User | null | undefined = undefined;
let cacheExpiry = 0;

export function getCurrentUser(): Promise<User> {
  const now = Date.now();
  if (cachedUser !== undefined && now < cacheExpiry) {
    return Promise.resolve(cachedUser as User);
  }
  return apiFetch<User>("/auth/current")
    .then((u) => {
      cachedUser = u;
      cacheExpiry = now + CACHE_TTL_MS;
      return u;
    })
    .catch((err: unknown) => {
      if (typeof err === "object" && err !== null && "status" in err && (err as { status: number }).status === 401) {
        clearUserCache();
      }
      throw err;
    });
}

/** 登录/登出后调用，使下次 getCurrentUser 重新请求 */
export function clearUserCache(): void {
  cachedUser = undefined;
  cacheExpiry = 0;
}

/** 开发模式：模拟登录（用于配置未完成时） */
export function mockWechatLogin(code: string): Promise<User> {
  const encoded = encodeURIComponent(code);
  return apiFetch<User>(`/auth/wechat/login?code=${encoded}`).then((u) => {
    clearUserCache();
    return u;
  });
}

export function wechatLogin(code: string): Promise<User> {
  const encoded = encodeURIComponent(code);
  return apiFetch<User>(`/auth/wechat/login?code=${encoded}`).then((u) => {
    clearUserCache();
    return u;
  });
}

export function logout(): Promise<{ message: string }> {
  clearUserCache();
  return apiFetch<{ message: string }>("/auth/logout", { method: "POST" });
}
