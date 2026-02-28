"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, BarChart3, List, User as UserIcon, KeyRound, Gift, FileText, Cat } from "lucide-react";
import type { User } from "@/lib/types";

interface NavBarProps {
  user: User | null;
  onLogin: () => void;
}

export function NavBar({ user, onLogin }: NavBarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed w-full top-0 z-50 nav-warm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <div className="bg-gradient-to-br from-[#FF6B4A] to-[#E55A3C] p-2 rounded-xl text-white group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-orange-200">
                  <Cat size={22} strokeWidth={2.5} />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#0D7377] rounded-full border-2 border-white animate-pulse" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gradient">校招喵</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 flex items-center gap-2 ${
                  isActive("/")
                    ? "text-[#FF6B4A] font-semibold bg-[#FF6B4A]/10"
                    : "text-[#5D6D7E] hover:text-[#FF6B4A] hover:bg-[#FF6B4A]/5"
                }`}
              >
                <List size={16} /> 职位查询
              </Link>
              <Link
                href="/progress"
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 flex items-center gap-2 ${
                  isActive("/progress")
                    ? "text-[#FF6B4A] font-semibold bg-[#FF6B4A]/10"
                    : "text-[#5D6D7E] hover:text-[#FF6B4A] hover:bg-[#FF6B4A]/5"
                }`}
              >
                <BarChart3 size={16} /> 进度统计
              </Link>
              <Link
                href="/exam"
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 flex items-center gap-2 ${
                  isActive("/exam")
                    ? "text-[#FF6B4A] font-semibold bg-[#FF6B4A]/10"
                    : "text-[#5D6D7E] hover:text-[#FF6B4A] hover:bg-[#FF6B4A]/5"
                }`}
              >
                <FileText size={16} /> 笔面试资料
              </Link>
              {user?.isVip && (
                <Link
                  href="/referral-codes"
                  className={`px-4 py-2 rounded-full text-sm transition-all duration-200 flex items-center gap-2 ${
                    isActive("/referral-codes")
                      ? "text-[#FF6B4A] font-semibold bg-[#FF6B4A]/10"
                      : "text-[#5D6D7E] hover:text-[#FF6B4A] hover:bg-[#FF6B4A]/5"
                  }`}
                >
                  <KeyRound size={16} /> 内推码
                </Link>
              )}
              {user && (
                <Link
                  href="/invite"
                  className={`px-4 py-2 rounded-full text-sm transition-all duration-200 flex items-center gap-2 ${
                    isActive("/invite")
                      ? "text-[#FF6B4A] font-semibold bg-[#FF6B4A]/10"
                      : "text-[#5D6D7E] hover:text-[#FF6B4A] hover:bg-[#FF6B4A]/5"
                  }`}
                >
                  <Gift size={16} /> 邀请有礼
                </Link>
              )}
              <Link
                href="/vip"
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 flex items-center gap-2 ${
                  isActive("/vip")
                    ? "text-[#FF6B4A] font-semibold bg-[#FF6B4A]/10"
                    : "text-[#5D6D7E] hover:text-[#FF6B4A] hover:bg-[#FF6B4A]/5"
                }`}
              >
                <Crown size={16} className={user?.isVip ? "text-amber-500 fill-amber-500" : ""} /> 会员中心
              </Link>
            </div>
          </div>

          {/* User Section */}
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-[#E8E8E8]">
                {user.isVip && (
                  <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1.5 text-xs font-bold text-amber-700 border border-amber-200/50 shadow-sm">
                    <Crown size={12} className="fill-amber-500 text-amber-500" /> VIP
                  </span>
                )}
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0D7377] to-[#14A085] flex items-center justify-center shadow-lg shadow-teal-200 group-hover:scale-105 transition-transform">
                    <UserIcon size={20} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-[#2C3E50] hidden sm:block">{user.nickname}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="btn btn-primary shadow-lg shadow-orange-200"
              >
                微信登录
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden flex justify-around border-t border-[#E8E8E8]/60 bg-white/95 backdrop-blur-sm fixed bottom-0 w-full pt-2 pb-safe z-50 shadow-[0_-4px_20px_-5px_rgba(44,62,80,0.08)]">
        <Link
          href="/"
          className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${pathname === "/" ? "text-[#FF6B4A]" : "text-[#95A5A6]"}`}
        >
          <List size={22} strokeWidth={pathname === "/" ? 2.5 : 2} />
          <span className="text-[10px] font-semibold mt-1">职位</span>
        </Link>
        <Link
          href="/progress"
          className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${pathname === "/progress" ? "text-[#FF6B4A]" : "text-[#95A5A6]"}`}
        >
          <BarChart3 size={22} strokeWidth={pathname === "/progress" ? 2.5 : 2} />
          <span className="text-[10px] font-semibold mt-1">进度</span>
        </Link>
        <Link
          href="/exam"
          className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${pathname === "/exam" ? "text-[#FF6B4A]" : "text-[#95A5A6]"}`}
        >
          <FileText size={22} strokeWidth={pathname === "/exam" ? 2.5 : 2} />
          <span className="text-[10px] font-semibold mt-1">资料</span>
        </Link>
        {user?.isVip && (
          <Link
            href="/referral-codes"
            className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${pathname === "/referral-codes" ? "text-[#FF6B4A]" : "text-[#95A5A6]"}`}
          >
            <KeyRound size={22} strokeWidth={pathname === "/referral-codes" ? 2.5 : 2} />
            <span className="text-[10px] font-semibold mt-1">内推</span>
          </Link>
        )}
        {user && (
          <Link
            href="/invite"
            className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${pathname === "/invite" ? "text-[#FF6B4A]" : "text-[#95A5A6]"}`}
          >
            <Gift size={22} strokeWidth={pathname === "/invite" ? 2.5 : 2} />
            <span className="text-[10px] font-semibold mt-1">邀请</span>
          </Link>
        )}
        <Link
          href="/vip"
          className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${pathname === "/vip" ? "text-[#FF6B4A]" : "text-[#95A5A6]"}`}
        >
          <Crown size={22} strokeWidth={pathname === "/vip" ? 2.5 : 2} className={user?.isVip ? "text-amber-500 fill-amber-500" : ""} />
          <span className="text-[10px] font-semibold mt-1">会员</span>
        </Link>
      </div>
    </nav>
  );
}
