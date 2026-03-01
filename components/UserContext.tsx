"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getCurrentUser, wechatLogin } from "@/lib/authService";
import { bindInviteCode } from "@/lib/inviteService";
import type { User } from "@/lib/types";

type UserContextType = {
  user: User | null;
  setUser: (u: User | null) => void;
  onLogin: () => void;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

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

  const onLogin = useCallback(() => {
    const code = window.prompt("输入微信 code（开发模式可随便填）：", `openid_${Date.now()}`);
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
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, onLogin }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
