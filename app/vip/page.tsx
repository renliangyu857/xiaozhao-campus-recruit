"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Check, Bell, BookOpen, Sparkles, Star, Zap } from "lucide-react";
import { getVipPlans, getVipDashboard, createVipOrder } from "@/lib/vipService";
import { getCurrentUser } from "@/lib/authService";
import { ApiError } from "@/lib/apiClient";
import { useUser } from "@/components/UserContext";
import { clearUserCache } from "@/lib/authService";
import { PaymentSuccessModal } from "@/components/PaymentSuccessModal";
import type { VipPlan, VipDashboard } from "@/lib/types";

function buildVipTickerMessages(): string[] {
  const plans = ["1个月会员", "3个月会员", "年度会员"];
  const messages: string[] = [];
  for (let i = 0; i < 30; i++) {
    const type = i % 2;
    if (type === 0) {
      messages.push(`用户*** 已购买 ${plans[i % plans.length]}`);
    } else {
      messages.push(`用户*** 已投递 ${50 + (i % 251)} 家职位，抢占先机`);
    }
  }
  return messages;
}

const VIP_TICKER_MESSAGES = buildVipTickerMessages();

const BENEFIT_ROWS: { id: string; label: string; note?: string; plans: ("1_month" | "3_month" | "1_year")[]; exclusive?: boolean }[] = [
  { id: "query", label: "无限查询校招信息", plans: ["1_month", "3_month", "1_year"] },
  { id: "board", label: "投递进度管理看板", plans: ["1_month", "3_month", "1_year"] },
  { id: "collect", label: "职位收藏与追踪", plans: ["1_month", "3_month", "1_year"] },
  { id: "referral", label: "名企内推码库", plans: ["1_month", "3_month", "1_year"] },
  { id: "community", label: "专属求职社群", plans: ["1_month", "3_month", "1_year"] },
  { id: "push", label: "个性化岗位推送", note: "关注公司和职位后，岗位上新后通过公众号个性化推送", plans: ["3_month", "1_year"], exclusive: true },
  { id: "material", label: "解锁全部笔面试资料", plans: ["3_month", "1_year"], exclusive: true },
  { id: "priority", label: "专属客服优先支持", plans: ["1_year"], exclusive: true },
];

const PLAN_ORDER: ("1_month" | "3_month" | "1_year")[] = ["1_month", "3_month", "1_year"];

const PLAN_META: Record<string, { icon: React.ReactNode; color: string; bgGradient: string }> = {
  "1_month": {
    icon: <Star className="w-5 h-5" />,
    color: "#5D6D7E",
    bgGradient: "from-slate-100 to-slate-50",
  },
  "3_month": {
    icon: <Zap className="w-5 h-5" />,
    color: "#FF6B4A",
    bgGradient: "from-orange-50 to-rose-50",
  },
  "1_year": {
    icon: <Crown className="w-5 h-5" />,
    color: "#0D7377",
    bgGradient: "from-teal-50 to-cyan-50",
  },
};

// 计算立省金额
function getSavings(plan: VipPlan): number | null {
  if (plan.id === "1_month") return null;
  const monthlyPrice = 9.9;
  if (plan.id === "3_month") {
    return Math.round((monthlyPrice * 3 - plan.price) * 10) / 10;
  }
  if (plan.id === "1_year") {
    return Math.round((monthlyPrice * 12 - plan.price) * 10) / 10;
  }
  return plan.originalPrice - plan.price;
}

// 获取显示用的原价
function getDisplayOriginalPrice(plan: VipPlan): number | null {
  if (plan.id === "1_month") return plan.originalPrice;
  const monthlyPrice = 9.9;
  if (plan.id === "3_month") return Math.round(monthlyPrice * 3 * 10) / 10;
  if (plan.id === "1_year") return Math.round(monthlyPrice * 12 * 10) / 10;
  return plan.originalPrice;
}

// 获取显示用的标签
function getDisplayTag(plan: VipPlan): string {
  if (plan.id === "1_month") return "灵活体验";
  if (plan.id === "3_month") return "最受欢迎";
  return "超值之选";
}

export default function VIPPage() {
  const { user, setUser } = useUser();
  const [plans, setPlans] = useState<VipPlan[]>([]);
  const [dashboard, setDashboard] = useState<Pick<VipDashboard, "isTrial" | "referralCodeCount" | "vipExpiry"> | null>(null);
  const [loading, setLoading] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  // 购买成功弹窗状态
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [purchasedPlanName, setPurchasedPlanName] = useState("");
  const [purchasedExpiryDate, setPurchasedExpiryDate] = useState("");

  useEffect(() => {
    setMounted(true);
    getVipPlans().then(setPlans).catch(console.error);
  }, []);

  useEffect(() => {
    if (!user?.isVip) return;
    getVipDashboard().then((d) => setDashboard({ isTrial: d.isTrial, referralCodeCount: d.referralCodeCount, vipExpiry: d.vipExpiry })).catch(() => {});
  }, [user?.id, user?.isVip]);

  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => setTickerIndex((prev) => (prev + 1) % VIP_TICKER_MESSAGES.length), 3000);
    return () => clearInterval(interval);
  }, [mounted]);

  const handleUpgrade = async (planId: string) => {
    if (!user) {
      alert("请先登录");
      return;
    }
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    if (!window.confirm(`确认支付 ¥${plan.price} 开通 ${plan.name}？`)) return;
    setLoading(true);
    try {
      const orderResult = await createVipOrder(plan.id);

      // 刷新用户信息以获取最新的VIP状态
      clearUserCache();
      const u = await getCurrentUser();
      setUser(u);

      // 获取仪表盘信息
      if (u.isVip) {
        const d = await getVipDashboard();
        setDashboard({ isTrial: d.isTrial, referralCodeCount: d.referralCodeCount, vipExpiry: d.vipExpiry });
      }

      // 显示购买成功弹窗 - 优先使用订单返回的新到期时间
      setPurchasedPlanName(plan.name);
      setPurchasedExpiryDate(orderResult.newVipExpiry ?? d?.vipExpiry ?? u.vipExpiry ?? "");
      setShowSuccessModal(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) alert("请先登录");
      else alert(((e as ApiError)?.body as { message?: string })?.message ?? (e as Error)?.message ?? "下单失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F5] pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      {/* 顶部滚动通知 */}
      <div className="fixed top-16 left-0 right-0 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-orange-100 py-2.5 overflow-hidden z-40">
        <div className="flex justify-center items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-xs font-medium text-orange-800">
            {mounted ? VIP_TICKER_MESSAGES[tickerIndex] : VIP_TICKER_MESSAGES[0]}
          </span>
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-10">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl mb-5 shadow-lg shadow-orange-200/50">
            <Crown className="w-10 h-10 text-[#FF6B4A]" />
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #2C3E50 0%, #FF6B4A 50%, #0D7377 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            购买 VIP，校招快人一步
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            无限查询 · 进度管理 · 内推码库 · 笔面试资料，让求职之路更加顺畅
          </p>
        </div>

        {/* VIP 状态卡片 */}
        {user?.isVip && (
          <div className="mb-12 mx-auto max-w-3xl relative overflow-hidden rounded-3xl shadow-2xl shadow-orange-200/50">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B4A] via-[#FF8F7A] to-[#0D7377] opacity-90" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnptMCAwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-30" />
            <div className="relative p-8 sm:p-10">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="h-24 w-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-xl shrink-0 border border-white/30">
                  <Crown size={48} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    {user.isTrial || dashboard?.isTrial ? "体验会员" : "尊贵的 VIP 会员"}
                  </h2>
                  <p className="text-white/80 text-base">
                    会员有效期至：<span className="font-mono font-bold text-white text-lg">{dashboard?.vipExpiry ?? user.vipExpiry ?? "—"}</span>
                  </p>
                  {dashboard && (dashboard.referralCodeCount ?? 0) > 0 && (
                    <p className="mt-2 text-white/70 text-sm">
                      内推码库共 {dashboard.referralCodeCount} 个热门公司
                      <Link href="/referral-codes" className="ml-2 text-white hover:text-orange-100 font-medium underline underline-offset-2">
                        去查看 →
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 定价卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PLAN_ORDER.map((planId) => {
            const plan = plans.find((p) => p.id === planId);
            if (!plan) return null;

            const isRecommended = plan.id === "3_month";
            const savings = getSavings(plan);
            const displayOriginalPrice = getDisplayOriginalPrice(plan);
            const displayTag = getDisplayTag(plan);
            const meta = PLAN_META[plan.id];

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02] ${
                  isRecommended
                    ? "bg-white shadow-2xl shadow-orange-200/50 ring-2 ring-[#FF6B4A]/20 scale-105 md:scale-110 z-10"
                    : "bg-white shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/50"
                }`}
              >
                {/* 推荐标签 */}
                {isRecommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] text-white text-xs font-bold shadow-lg">
                      <Star className="w-3 h-3" /> 最受欢迎
                    </span>
                  </div>
                )}

                {/* 方案头部 */}
                <div className={`text-center pb-6 mb-6 border-b ${isRecommended ? "border-orange-100" : "border-slate-100"}`}>
                  <div
                    className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${
                      isRecommended
                        ? "bg-gradient-to-br from-[#FF6B4A] to-[#FF8F7A] text-white shadow-lg shadow-orange-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {meta.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{plan.name}</h3>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      isRecommended
                        ? "bg-orange-50 text-[#FF6B4A]"
                        : plan.id === "1_year"
                        ? "bg-teal-50 text-[#0D7377]"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {displayTag}
                  </span>
                </div>

                {/* 价格 */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-lg text-slate-400">¥</span>
                    <span className={`font-bold ${isRecommended ? "text-5xl text-[#FF6B4A]" : "text-4xl text-slate-800"}`}>
                      {plan.price}
                    </span>
                  </div>
                  {displayOriginalPrice && displayOriginalPrice > plan.price && (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="text-sm text-slate-400 line-through">¥{displayOriginalPrice}</span>
                      {savings !== null && savings > 0 && (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          省 ¥{savings}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 购买按钮 */}
                <button
                  type="button"
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading}
                  className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-200 ${
                    isRecommended
                      ? "bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] text-white shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 hover:-translate-y-0.5"
                      : plan.id === "1_year"
                      ? "bg-gradient-to-r from-[#0D7377] to-[#14A085] text-white shadow-lg shadow-teal-200 hover:shadow-xl hover:shadow-teal-300 hover:-translate-y-0.5"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {user?.isVip ? "购买" : "立即开通"}
                </button>
              </div>
            );
          })}
        </div>

        {/* 权益对比表格 */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FF6B4A]" />
              会员权益对比
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">权益项目</th>
                  {PLAN_ORDER.map((planId) => {
                    const plan = plans.find((p) => p.id === planId);
                    if (!plan) return null;
                    const isRecommended = plan.id === "3_month";
                    return (
                      <th
                        key={plan.id}
                        className={`px-6 py-4 text-center text-sm font-bold ${
                          isRecommended ? "text-[#FF6B4A] bg-orange-50/50" : "text-slate-700"
                        }`}
                      >
                        {plan.name}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {BENEFIT_ROWS.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-50 transition-colors hover:bg-slate-50/50 ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {row.exclusive && (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B4A] to-[#FF8F7A] text-white shadow-sm">
                            {row.id === "push" && <Bell className="h-3.5 w-3.5" />}
                            {row.id === "material" && <BookOpen className="h-3.5 w-3.5" />}
                            {row.id === "priority" && <Sparkles className="h-3.5 w-3.5" />}
                          </span>
                        )}
                        {!row.exclusive && (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <div>
                          <span className="font-medium text-slate-700">{row.label}</span>
                          {row.note && <p className="mt-0.5 text-xs text-slate-400">{row.note}</p>}
                        </div>
                      </div>
                    </td>
                    {PLAN_ORDER.map((planId) => (
                      <td
                        key={planId}
                        className={`px-6 py-4 text-center ${planId === "3_month" ? "bg-orange-50/30" : ""}`}
                      >
                        {row.plans.includes(planId) ? (
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check className="h-4 w-4" strokeWidth={2.5} />
                          </span>
                        ) : (
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                            <span className="text-lg">—</span>
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <p className="text-center text-xs text-slate-400">
              支付即代表同意
              <Link href="#" className="text-[#FF6B4A] hover:underline mx-1">
                《会员服务协议》
              </Link>
              和
              <Link href="#" className="text-[#FF6B4A] hover:underline mx-1">
                《隐私政策》
              </Link>
            </p>
          </div>
        </div>

        {/* 底部 FAQ 提示 */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            有疑问？请联系客服微信：
            <span className="font-medium text-slate-700">campusrecruit_cat</span>
          </p>
        </div>
      </div>

      {/* 购买成功弹窗 */}
      <PaymentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        planName={purchasedPlanName}
        expiryDate={purchasedExpiryDate}
        onExperience={() => {
          // 可以跳转到某个功能页面，如投递进度管理
          window.location.href = "/progress";
        }}
        onViewBenefits={() => {
          // 滚动到权益对比表格
          document.querySelector("table")?.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </div>
  );
}
