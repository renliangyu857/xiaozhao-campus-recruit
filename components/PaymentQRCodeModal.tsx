"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  pollOrderStatus,
  formatAmount,
  calculateCountdown,
  getQRCodeImageUrl,
  type OrderStatus,
} from "@/lib/payment";
import { PAYMENT_ORDER_EXPIRY_SECONDS } from "@/lib/payment-constants";

interface PaymentQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNo: string;
  productName: string;
  amount: number;
  originalAmount?: number;
  isFirstMonth?: boolean;
  expiryTime: number;
  onPaymentSuccess?: (status: OrderStatus) => void;
  onPaymentExpired?: () => void;
}

export function PaymentQRCodeModal({
  isOpen,
  onClose,
  orderNo,
  productName,
  amount,
  originalAmount,
  isFirstMonth,
  expiryTime,
  onPaymentSuccess,
  onPaymentExpired,
}: PaymentQRCodeModalProps) {
  const [status, setStatus] = useState<"pending" | "paid" | "expired" | "error">("pending");
  const [countdown, setCountdown] = useState(calculateCountdown(expiryTime));
  const [qrCodeUrl, setQrCodeUrl] = useState(getQRCodeImageUrl(orderNo));
  const [error, setError] = useState<string>("");

  // 刷新二维码（处理缓存问题）
  const refreshQRCode = useCallback(() => {
    setQrCodeUrl(`${getQRCodeImageUrl(orderNo)}?t=${Date.now()}`);
  }, [orderNo]);

  useEffect(() => {
    if (!isOpen) return;

    setStatus("pending");
    setError("");
    setCountdown(calculateCountdown(expiryTime));
    setQrCodeUrl(getQRCodeImageUrl(orderNo));
  }, [isOpen, orderNo, expiryTime]);

  // ???
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      const remaining = calculateCountdown(expiryTime);
      setCountdown(remaining);

      if (remaining <= 0 && status === "pending") {
        setStatus("expired");
        onPaymentExpired?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, expiryTime, status, onPaymentExpired]);

  // ??????
  useEffect(() => {
    if (!isOpen || status !== "pending") return;

    let cancelled = false;

    const poll = async () => {
      try {
        const orderStatus = await pollOrderStatus(orderNo, {
          interval: 2000,
          maxAttempts: Math.ceil((PAYMENT_ORDER_EXPIRY_SECONDS * 1000) / 2000),
        });

        if (cancelled) return;

        setStatus("paid");
        onPaymentSuccess?.(orderStatus);
      } catch (error) {
        if (cancelled) return;

        const message = error instanceof Error ? error.message : "";

        if (message.includes("超时")) {
          setStatus("expired");
          onPaymentExpired?.();
        } else {
          setStatus("error");
          setError(message);
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [isOpen, orderNo, status, onPaymentSuccess, onPaymentExpired]);

  // 格式化倒计时
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* 背景遮罩 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
          onClick={status === "pending" ? undefined : onClose}
        />

        {/* 主弹窗 */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>

          {/* 头部 */}
          <div className="bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] p-6 text-white">
            <h3 className="text-xl font-bold mb-1">微信支付</h3>
            <p className="text-white/80 text-sm">请使用微信扫一扫完成支付</p>
          </div>

          {/* 内容区 */}
          <div className="p-6">
            {/* 商品信息 */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-800 font-medium">{productName}</span>
                  {isFirstMonth && (
                    <span className="px-2 py-0.5 bg-[#FF6B4A]/10 text-[#FF6B4A] text-xs rounded-full">
                      首月特惠
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-500 mt-1">购买后自动开通会员</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#FF6B4A]">
                  ¥{formatAmount(amount)}
                </div>
                {originalAmount && originalAmount > amount && (
                  <div className="text-sm text-slate-400 line-through">
                    ¥{formatAmount(originalAmount)}
                  </div>
                )}
              </div>
            </div>

            {/* 二维码区域 */}
            {status === "pending" && (
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  {/* 二维码图片 */}
                  <div className="w-64 h-64 mx-auto bg-white p-3 rounded-xl shadow-lg border border-slate-100">
                    <Image
                      src={qrCodeUrl}
                      alt="微信支付二维码"
                      width={232}
                      height={232}
                      className="w-full h-full"
                      onError={refreshQRCode}
                    />
                  </div>

                  {/* 倒计时 */}
                  <div className="absolute -top-2 -right-2 bg-[#FF6B4A] text-white px-3 py-1 rounded-full text-sm font-medium">
                    {formatCountdown(countdown)}
                  </div>
                </div>

                <p className="text-slate-600 mb-2">请使用微信扫一扫</p>
                <p className="text-slate-400 text-sm">二维码有效期{PAYMENT_ORDER_EXPIRY_SECONDS / 60}分钟</p>

                {/* 刷新按钮 */}
                <button
                  onClick={refreshQRCode}
                  className="mt-4 flex items-center gap-1 mx-auto text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  刷新二维码
                </button>
              </div>
            )}

            {/* 支付成功 */}
            {status === "paid" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">支付成功！</h4>
                <p className="text-slate-500 mb-6">您的会员权益已开通</p>
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] hover:shadow-lg transition-shadow"
                >
                  立即体验
                </button>
              </motion.div>
            )}

            {/* 订单过期 */}
            {status === "expired" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-slate-400" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">订单已过期</h4>
                <p className="text-slate-500 mb-6">二维码已失效，请重新下单</p>
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  重新支付
                </button>
              </motion.div>
            )}

            {/* 错误状态 */}
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">支付出错</h4>
                <p className="text-slate-500 mb-6">{error || "请稍后重试"}</p>
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  关闭
                </button>
              </motion.div>
            )}

            {/* 加载中 */}
            {status === "pending" && countdown > 0 && (
              <div className="flex items-center justify-center gap-2 mt-6 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>等待支付...</span>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
