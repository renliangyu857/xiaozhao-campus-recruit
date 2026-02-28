"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2, Gift, Copy, CheckCircle, Sparkles, Users, Star } from "lucide-react";
import { getInviteStats, type InviteStats } from "@/lib/inviteService";
import { useUser } from "@/components/UserContext";

function buildInviteTickerMessages(): string[] {
  const name = "mpweixin***";
  const messages: string[] = [];
  for (let i = 0; i < 30; i++) {
    const n = Math.floor(Math.random() * 11) + 1;
    const reward = n > 10 ? "1 个月 VIP" : n <= 5 ? `${2 * n} 天 VIP` : `${10 + (n - 5) * 4} 天 VIP`;
    messages.push(`${name} 已邀请 ${n} 人获得 ${reward}`);
  }
  return messages.sort(() => Math.random() - 0.5);
}

const INVITE_TICKER_MESSAGES = buildInviteTickerMessages();

function buildInviteLink(inviteCode: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/?inviteCode=${encodeURIComponent(inviteCode)}`;
}

export default function InvitePage() {
  const { user } = useUser();
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTickerIndex((i) => (i + 1) % INVITE_TICKER_MESSAGES.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    getInviteStats().then(setStats).catch(console.error);
  }, [user?.id]);

  const inviteLink = stats?.inviteCode ? buildInviteLink(stats.inviteCode) : "";

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B4A] to-[#FF8F7A] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-200">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">请先登录</h2>
          <p className="text-slate-500 mt-2">登录后即可参与邀请活动</p>
          <Link href="/" className="mt-4 inline-block text-[#FF6B4A] font-medium hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const totalInvited = stats?.totalInvited ?? 0;
  const calculateTotalReward = (n: number): number => {
    if (n <= 5) return n * 2;
    return 5 * 2 + (n - 5) * 4;
  };
  const totalRewardDays = calculateTotalReward(totalInvited);
  const progress = Math.min(totalInvited, 10);

  let nextReward = "";
  let needed = 0;
  if (totalInvited < 5) {
    needed = 5 - totalInvited;
    nextReward = `解锁10天VIP奖励`;
  } else if (totalInvited < 10) {
    needed = 10 - totalInvited;
    nextReward = "1个月VIP";
  } else {
    nextReward = "已达成最高奖励";
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] pt-20 pb-12 px-4">
      {/* 顶部滚动通知 */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-[#FF6B4A]/10 via-[#FF8F7A]/10 to-[#0D7377]/10 border-b border-[#FF6B4A]/10 py-2.5 overflow-hidden">
        <div className="flex justify-center items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#FF6B4A]" />
          <span className="text-xs font-medium text-slate-700">{INVITE_TICKER_MESSAGES[tickerIndex]}</span>
          <Sparkles className="w-3.5 h-3.5 text-[#0D7377]" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6 pt-10">
        {/* 标签 */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] text-white text-sm font-bold shadow-lg shadow-orange-200">
            <Gift size={18} /> 邀请有礼
          </span>
        </div>

        {/* 主卡片 */}
        <div className="bg-gradient-to-br from-[#FF6B4A] via-[#FF8F7A] to-[#0D7377] rounded-3xl p-8 text-white shadow-2xl shadow-orange-200/50 relative overflow-hidden">
          {/* 装饰元素 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12 blur-2xl" />
          <div className="absolute top-1/2 right-10 w-2 h-2 bg-white/40 rounded-full" />
          <div className="absolute top-1/3 right-20 w-1.5 h-1.5 bg-white/30 rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <Star className="w-6 h-6 text-white/80" />
              <h1 className="text-2xl sm:text-3xl font-bold">邀请好友，一起用校招喵</h1>
            </div>
            <p className="text-white/80 text-base sm:text-lg leading-relaxed">
              前 5 人每人得 2 天 VIP，第 6 人起你得 4 天 VIP，最高可得 1 个月 VIP
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="text-sm text-white/70 mb-1">我的邀请码</div>
                <div className="text-2xl font-mono font-bold tracking-wider">{stats?.inviteCode || "加载中…"}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="text-sm text-white/70 mb-1">已成功邀请</div>
                <div className="text-2xl font-bold">
                  {totalInvited} <span className="text-sm font-normal text-white/70">人</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 奖励进度 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-[#FF6B4A] to-[#FF8F7A] rounded-xl">
              <Gift className="w-4 h-4 text-white" />
            </div>
            奖励进度
          </h3>

          <div className="relative pt-6 pb-2">
            {/* 进度条背景 */}
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] transition-all duration-700 ease-out rounded-full"
                style={{ width: `${(progress / 10) * 100}%` }}
              />
            </div>

            {/* 里程碑标记 */}
            <div className="flex justify-between mt-6">
              <div className="text-center -ml-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 mx-auto text-sm font-bold transition-all ${
                  totalInvited >= 0 ? "bg-gradient-to-br from-[#FF6B4A] to-[#FF8F7A] text-white shadow-md shadow-orange-200" : "bg-slate-100 text-slate-400"
                }`}>0</div>
                <span className="text-xs text-slate-500">起点</span>
              </div>
              <div className="text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 mx-auto text-sm font-bold transition-all ${
                  totalInvited >= 5 ? "bg-gradient-to-br from-[#FF6B4A] to-[#FF8F7A] text-white shadow-md shadow-orange-200" : "bg-slate-100 text-slate-400"
                }`}>5</div>
                <span className="text-xs font-semibold text-slate-700">解锁10天</span>
              </div>
              <div className="text-center -mr-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 mx-auto text-sm font-bold transition-all ${
                  totalInvited >= 10 ? "bg-gradient-to-br from-[#0D7377] to-[#14A085] text-white shadow-md shadow-teal-200" : "bg-slate-100 text-slate-400"
                }`}>10</div>
                <span className="text-xs font-semibold text-slate-700">1个月VIP</span>
              </div>
            </div>
          </div>

          {/* 奖励统计 */}
          <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 px-5 py-4 rounded-xl text-center border border-amber-100">
            <span className="text-sm">已累计获得 </span>
            <span className="text-xl font-bold text-[#FF6B4A]">{totalRewardDays}</span>
            <span className="text-sm"> 天VIP奖励</span>
          </div>

          {/* 下一阶段提示 */}
          {needed > 0 ? (
            <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 px-5 py-4 rounded-xl text-center border border-blue-100">
              再邀请 <span className="font-bold text-[#FF6B4A]">{needed}</span> 人即可获得 <span className="font-bold">{nextReward}</span>
            </div>
          ) : (
            <div className="mt-4 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 px-5 py-4 rounded-xl text-center font-bold border border-emerald-100">
              🎉 太棒了！您已解锁所有阶段奖励！
            </div>
          )}
        </div>

        {/* 分享卡片 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-[#0D7377] to-[#14A085] rounded-xl">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            立即分享
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-600 text-sm focus:outline-none focus:ring-4 focus:ring-slate-100"
            />
            <button
              onClick={handleCopy}
              disabled={!inviteLink}
              className={`px-6 py-3.5 rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50 ${
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-gradient-to-r from-[#0D7377] to-[#14A085] text-white hover:shadow-lg hover:shadow-teal-200"
              }`}
            >
              {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              {copied ? "已复制" : "复制链接"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
