"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Check, Bell, BookOpen, Sparkles, Star } from "lucide-react";
import { getVipPlans, getVipDashboard } from "@/lib/vipService";
import { getCurrentUser } from "@/lib/authService";
import { ApiError } from "@/lib/apiClient";
import { useUser } from "@/components/UserContext";
import { clearUserCache } from "@/lib/authService";
import { PaymentSuccessModal } from "@/components/PaymentSuccessModal";
import { PaymentQRCodeModal } from "@/components/PaymentQRCodeModal";
import { createPayment, type CreatePaymentResult } from "@/lib/payment";
import type { VipPlan, VipDashboard } from "@/lib/types";
import { SchemaOrg } from "@/components/SchemaOrg";
import { VIP_PRODUCT_DATA } from "@/components/StructuredData";

function buildVipTickerMessages(): string[] {
  const plans = ["永久会员"];
  const messages: string[] = [];
  for (let i = 0; i < 30; i++) {
    const type = i % 2;
    if (type === 0) {
      messages.push(`用户*** 已开通 ${plans[i % plans.length]}`);
    } else {
      messages.push(`用户*** 已投递 ${50 + (i % 251)} 家职位，抢占先机`);
    }
  }
  return messages;
}

const VIP_TICKER_MESSAGES = buildVipTickerMessages();

// 永久会员全部权益（无差别解锁）
const LIFETIME_BENEFITS: { id: string; label: string; note?: string; icon: React.ReactNode }[] = [
  { id: "query", label: "无限查询校招信息", icon: <Check className="h-3.5 w-3.5" /> },
  { id: "board", label: "投递进度管理看板", icon: <Check className="h-3.5 w-3.5" /> },
  { id: "collect", label: "职位收藏与追踪", icon: <Check className="h-3.5 w-3.5" /> },
  { id: "referral", label: "名企内推码库", icon: <Check className="h-3.5 w-3.5" /> },
  { id: "community", label: "专属求职社群", icon: <Check className="h-3.5 w-3.5" /> },
  { id: "push", label: "个性化岗位推送", note: "关注公司和职位后，岗位上新后通过公众号个性化推送", icon: <Bell className="h-3.5 w-3.5" /> },
  { id: "material", label: "解锁全部笔面试资料", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: "priority", label: "专属客服优先支持", icon: <Sparkles className="h-3.5 w-3.5" /> },
];

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

  // 微信支付二维码弹窗状态
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<CreatePaymentResult | null>(null);

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

    setLoading(true);
    try {
      // 创建支付订单
      const paymentResult = await createPayment({
        productType: "vip",
        productId: planId,
      });

      // 保存支付数据并显示二维码弹窗
      setPaymentData(paymentResult);
      setPurchasedPlanName(plan.name);
      setShowPaymentModal(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) alert("请先登录");
      else alert(((e as ApiError)?.body as { message?: string })?.message ?? (e as Error)?.message ?? "创建支付订单失败");
    } finally {
      setLoading(false);
    }
  };

  // 处理支付成功
  const handlePaymentSuccess = async (status: { validEndAt?: string }) => {
    setShowPaymentModal(false);

    // 刷新用户信息以获取最新的VIP状态
    clearUserCache();
    const u = await getCurrentUser();
    setUser(u);

    // 获取仪表盘信息
    let expiryDate = status.validEndAt;
    if (u.isVip) {
      try {
        const d = await getVipDashboard();
        setDashboard({ isTrial: d.isTrial, referralCodeCount: d.referralCodeCount, vipExpiry: d.vipExpiry });
        expiryDate = d.vipExpiry ?? expiryDate;
      } catch {
        // 忽略仪表盘错误
      }
    }

    // 显示购买成功弹窗
    setPurchasedExpiryDate(expiryDate ?? u.vipExpiry ?? "");
    setShowSuccessModal(true);
  };

  return (
    <>
      {/* 产品结构化数据 */}
      <SchemaOrg
        type="Product"
        data={VIP_PRODUCT_DATA}
      />
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

      <div className="max-w-3xl mx-auto mt-10">
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
            一次付费，永久解锁无限查询 · 进度管理 · 内推码库 · 笔面试资料，让求职之路更加顺畅
          </p>
        </div>

        {/* VIP 状态卡片 */}
        {user?.isVip && (
          <div className="mb-12 mx-auto max-w-3xl relative overflow-hidden rounded-3xl shadow-2xl shadow-orange-200/50">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B4A] via-[#FF8F7A] to-[#0D7377] opacity-90" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZCI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDYuODYgNiA2IDZ6bTAgMCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L2c+PC9zdmc+')] opacity-30" />
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

        {/* 定价卡片（单一 19.9 永久） */}
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="relative rounded-3xl p-8 bg-white shadow-2xl shadow-orange-200/50 ring-2 ring-[#FF6B4A]/20"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] text-white text-xs font-bold shadow-lg">
                <Star className="w-3 h-3" /> 终身全功能
              </span>
            </div>

            <div className="text-center pb-6 mb-6 border-b border-orange-100">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-gradient-to-br from-[#FF6B4A] to-[#FF8F7A] text-white shadow-lg shadow-orange-200">
                <Crown className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">{plan.name}</h3>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-[#FF6B4A]">
                {plan.tag}
              </span>
            </div>

            <div className="text-center mb-6">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-lg text-slate-400">¥</span>
                <span className="font-bold text-5xl text-[#FF6B4A]">{plan.price}</span>
                <span className="text-slate-400 ml-1">{plan.durationLabel}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleUpgrade(plan.id)}
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold transition-all duration-200 bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] text-white shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 hover:-translate-y-0.5"
            >
              {user?.isVip ? "续费永久会员" : "立即开通"}
            </button>

            {/* 权益清单 */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LIFETIME_BENEFITS.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B4A] to-[#FF8F7A] text-white shadow-sm">
                    {b.icon}
                  </span>
                  <div>
                    <span className="font-medium text-slate-700 text-sm">{b.label}</span>
                    {b.note && <p className="mt-0.5 text-xs text-slate-400">{b.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 底部 FAQ 提示 */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            有疑问？请联系客服微信：
            <span className="font-medium text-slate-700">campusrecruit_cat</span>
          </p>
          <p className="mt-3 text-xs text-slate-400">
            支付即代表同意
            <Link href="#" className="text-[#FF6B4A] hover:underline mx-1">《会员服务协议》</Link>
            和
            <Link href="#" className="text-[#FF6B4A] hover:underline mx-1">《隐私政策》</Link>
          </p>
        </div>
      </div>

      {/* 微信支付二维码弹窗 */}
      {paymentData && (
        <PaymentQRCodeModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          orderNo={paymentData.orderNo}
          productName={paymentData.productName}
          amount={paymentData.amount}
          originalAmount={paymentData.originalAmount}
          isFirstMonth={paymentData.isFirstMonth}
          expiryTime={paymentData.expiryTime}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentExpired={() => {
            // 订单过期，可以在这里添加重新支付的逻辑
          }}
        />
      )}

      {/* 购买成功弹窗 */}
      <PaymentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        planName={purchasedPlanName}
        expiryDate={purchasedExpiryDate}
        onExperience={() => {
          window.location.href = "/";
        }}
        onViewBenefits={() => {
          document.querySelector("table")?.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </div>
    </>
  );
}
