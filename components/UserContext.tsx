"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getCurrentUser, wechatLogin, clearUserCache } from "@/lib/authService";
import { bindInviteCode } from "@/lib/inviteService";
import { isWechatBrowser } from "@/lib/wechat";
import { WechatLoginModal } from "./WechatLoginModal";
import type { User } from "@/lib/types";

type UserContextType = {
  user: User | null;
  setUser: (u: User | null) => void;
  onLogin: () => void;
  isLoginModalOpen: boolean;
  closeLoginModal: () => void;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("inviteCode");
    if (code) sessionStorage.setItem("inviteCode", code);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const code = typeof window !== "undefined" ? sessionStorage.getItem("inviteCode") : null;
    if (!code) return;
    sessionStorage.removeItem("inviteCode");
    bindInviteCode(code).catch(() => {});
  }, [user?.id]);

  // 处理登录成功
  const handleLoginSuccess = useCallback(() => {
    // 刷新用户信息
    clearUserCache();
    getCurrentUser().then((u) => {
      setUser(u);
    });
  }, []);

  // 关闭登录弹窗
  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
  }, []);

  // 触发登录
  const onLogin = useCallback(() => {
    if (typeof window === "undefined") return;

    // 判断是否在微信浏览器内
    const isWechat = isWechatBrowser(window.navigator.userAgent);

    if (isWechat) {
      // 微信内：直接跳转授权页面
      (async () => {
        try {
          const res = await fetch("/api/auth/wechat/url?redirectPath=/");
          const data = await res.json();

          if (!res.ok) {
            // 配置未完成，显示提示
            if (data.details) {
              console.error("微信登录配置未完成:", data.details);
              // 开发模式下回退到模拟登录
              fallbackToMockLogin(setUser);
            } else {
              throw new Error(data.message || "获取授权链接失败");
            }
            return;
          }

          // 跳转到微信授权页
          window.location.href = data.url;
        } catch (e) {
          console.error("微信登录跳转失败:", e);
          // 开发模式下回退到模拟登录
          fallbackToMockLogin(setUser);
        }
      })();
    } else {
      // 非微信环境：显示二维码登录弹窗
      setIsLoginModalOpen(true);
    }
  }, []);

  return (
    <UserContext.Provider
      value={{ user, setUser, onLogin, isLoginModalOpen, closeLoginModal }}
    >
      {children}
      <WechatLoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </UserContext.Provider>
  );
}

/**
 * 开发模式回退：模拟登录（用于配置未完成时测试）
 */
function fallbackToMockLogin(setUser: (u: User) => void) {
  const code = window.prompt(
    "微信配置未完成，使用模拟登录（开发模式）：",
    `openid_${Date.now()}`
  );
  if (!code) return;
  wechatLogin(code)
    .then((u) => setUser(u))
    .catch((e: unknown) => {
      const msg =
        e && typeof e === "object" && "body" in e && (e.body as { message?: string })?.message
          ? (e.body as { message: string }).message
          : (e as Error)?.message ?? "登录失败";
      alert(msg);
    });
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
