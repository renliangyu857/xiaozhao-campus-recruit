"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, CheckCircle, ArrowLeft, MessageCircle, RefreshCw, UserPlus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// 服务号二维码图片 URL（从环境变量或配置中获取）
const WECHAT_QR_CODE_URL = process.env.NEXT_PUBLIC_WECHAT_QR_CODE_URL || "";
const WECHAT_OFFICIAL_NAME = process.env.NEXT_PUBLIC_WECHAT_OFFICIAL_NAME || "校招小助手";

export default function SubscribePage() {
  const searchParams = useSearchParams();
  const ticket = searchParams.get("ticket");
  const [countdown, setCountdown] = useState(5);
  const [checkStatus, setCheckStatus] = useState<"idle" | "checking" | "subscribed" | "not_subscribed">("idle");
  const [hasQrCode] = useState(!!WECHAT_QR_CODE_URL);

  // 倒计时自动检查（仅在有 ticket 时）
  useEffect(() => {
    if (!ticket) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      checkSubscription();
    }
  }, [countdown, ticket]);

  // 检查用户是否已关注
  const checkSubscription = async () => {
    if (!ticket) return;
    setCheckStatus("checking");

    try {
      const res = await fetch(`/api/auth/subscribe/check?ticket=${ticket}`);
      const data = await res.json();

      if (data.subscribed) {
        setCheckStatus("subscribed");
        // 跳转到登录成功页面
        window.location.href = `/auth/success?ticket=${ticket}&subscribed=true`;
      } else {
        setCheckStatus("not_subscribed");
        // 重新倒计时
        setCountdown(5);
      }
    } catch {
      setCheckStatus("not_subscribed");
      setCountdown(5);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* 顶部装饰 */}
        <div className="h-2 bg-gradient-to-r from-[#07C160] via-[#00B057] to-[#07C160]" />

        <div className="p-8">
          {/* 返回按钮 */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回首页</span>
          </Link>

          {/* 图标 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#07C160] to-[#00B057] flex items-center justify-center shadow-lg shadow-green-200"
          >
            <MessageCircle className="w-10 h-10 text-white" />
          </motion.div>

          {/* 标题 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              关注服务号完成登录
            </h1>
            <p className="text-slate-500 text-sm">
              为了提供更好的服务，请先关注我们的服务号
            </p>
          </motion.div>

          {/* 二维码区域 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-50 rounded-2xl p-6 mb-6"
          >
            <div className="flex flex-col items-center">
              {/* 服务号二维码 */}
              <div className="relative w-48 h-48 bg-white rounded-xl shadow-sm border-2 border-slate-100 flex flex-col items-center justify-center mb-4 overflow-hidden">
                {hasQrCode ? (
                  <Image
                    src={WECHAT_QR_CODE_URL}
                    alt={`${WECHAT_OFFICIAL_NAME}二维码`}
                    fill
                    className="object-contain p-2"
                    priority
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-300">
                    <QrCode className="w-16 h-16 mb-2" />
                    <span className="text-xs">服务号二维码</span>
                    <span className="text-[10px] mt-1">（请在后台配置）</span>
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="font-semibold text-slate-800 mb-1">{WECHAT_OFFICIAL_NAME}</p>
                <p className="text-xs text-slate-500">微信扫码关注服务号</p>
              </div>
            </div>
          </motion.div>

          {/* 步骤说明 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3 mb-6"
          >
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                1
              </div>
              <span className="text-slate-600">长按识别或扫描二维码</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                2
              </div>
              <span className="text-slate-600">点击关注服务号</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                3
              </div>
              <span className="text-slate-600">返回此页面自动完成登录</span>
            </div>
          </motion.div>

          {/* 状态提示 - 根据是否有 ticket 显示不同内容 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <AnimatePresence mode="wait">
              {!ticket ? (
                // H5 登录场景：没有 ticket，引导用户重新扫码
                <motion.div
                  key="no-ticket"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-xl p-3">
                    <UserPlus className="w-5 h-5" />
                    <span className="text-sm font-medium">关注后请返回重新登录</span>
                  </div>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#07C160] text-white font-medium hover:bg-[#06ae56] transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    返回首页重新登录
                  </Link>
                </motion.div>
              ) : checkStatus === "checking" ? (
                <motion.div
                  key="checking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 text-slate-500"
                >
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-green-500 rounded-full animate-spin" />
                  <span className="text-sm">正在检查关注状态...</span>
                </motion.div>
              ) : checkStatus === "subscribed" ? (
                <motion.div
                  key="subscribed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 text-green-600"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">已关注，正在跳转...</span>
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-slate-400 text-sm space-y-2"
                >
                  {countdown > 0 ? (
                    <span>{countdown} 秒后自动检查关注状态</span>
                  ) : (
                    <button
                      onClick={checkSubscription}
                      className="inline-flex items-center gap-2 text-[#07C160] hover:underline font-medium"
                    >
                      <RefreshCw className="w-4 h-4" />
                      立即检查关注状态
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* 底部提示 */}
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center">
            关注服务号后可接收校招信息推送和订单通知
          </p>
        </div>
      </motion.div>
    </div>
  );
}
