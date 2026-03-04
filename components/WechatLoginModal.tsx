"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, Smartphone, Loader2, CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

interface WechatLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface QrCodeData {
  ticket: string;
  qrCodeUrl: string; // 公众号带参数二维码图片 URL
  pollUrl: string;
  expiresIn: number;
}

type LoginStatus = "idle" | "loading" | "qr_ready" | "scanned" | "success" | "error" | "expired";

export function WechatLoginModal({ isOpen, onClose, onSuccess }: WechatLoginModalProps) {
  const [status, setStatus] = useState<LoginStatus>("idle");
  const [qrData, setQrData] = useState<QrCodeData | null>(null);
  const [error, setError] = useState<string>("");
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 生成二维码
  const generateQrCode = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const data = await apiFetch<QrCodeData>("/auth/qrcode");
      setQrData(data);
      setStatus("qr_ready");

      // 设置过期倒计时
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = setTimeout(() => {
        setStatus("expired");
      }, data.expiresIn * 1000);

      // 开始轮询
      startPolling(data.pollUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "生成二维码失败";
      setError(msg);
      setStatus("error");
    }
  }, []);

  // 轮询登录状态
  const startPolling = useCallback((pollUrl: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(pollUrl);
        const data = await res.json();

        switch (data.status) {
          case "pending":
            // 继续等待
            break;
          case "scanned":
            setStatus("scanned");
            break;
          case "success":
            setStatus("success");
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
            onSuccess?.();
            setTimeout(() => {
              onClose();
              window.location.reload();
            }, 1000);
            break;
          case "expired":
          case "cancelled":
            setStatus("expired");
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            break;
        }
      } catch {
        // 轮询失败，继续尝试
      }
    }, 2000); // 每 2 秒轮询一次
  }, [onClose, onSuccess]);

  // 打开弹窗时生成二维码
  useEffect(() => {
    if (isOpen && status === "idle") {
      generateQrCode();
    }
  }, [isOpen, status, generateQrCode]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, []);

  // 关闭时重置状态
  const handleClose = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    setStatus("idle");
    setQrData(null);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="p-8">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">微信登录</h2>
            <p className="text-gray-500 mt-2">请使用微信扫码关注公众号登录</p>
          </div>

          {/* 二维码区域 */}
          <div className="flex flex-col items-center">
            {/* 二维码容器 */}
            <div className="relative w-56 h-56 bg-white rounded-xl shadow-inner border-2 border-gray-100 flex items-center justify-center">
              {status === "loading" && (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-2" />
                  <span className="text-sm text-gray-500">生成中...</span>
                </div>
              )}

              {status === "qr_ready" && qrData && (
                <div className="relative w-[200px] h-[200px]">
                  <Image
                    src={qrData.qrCodeUrl}
                    alt="微信扫码关注登录"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              )}

              {status === "scanned" && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center">
                  <Smartphone className="w-12 h-12 text-green-500 mb-3" />
                  <p className="text-gray-700 font-medium">已关注</p>
                  <p className="text-sm text-gray-500 mt-1">正在登录...</p>
                </div>
              )}

              {status === "success" && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center">
                  <CheckCircle className="w-14 h-14 text-green-500 mb-3" />
                  <p className="text-gray-700 font-medium">登录成功</p>
                </div>
              )}

              {status === "expired" && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center">
                  <p className="text-gray-500 mb-3">二维码已过期</p>
                  <button
                    onClick={generateQrCode}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    重新生成
                  </button>
                </div>
              )}

              {status === "error" && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-4">
                  <p className="text-red-500 text-sm text-center mb-3">{error}</p>
                  <button
                    onClick={generateQrCode}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    重试
                  </button>
                </div>
              )}
            </div>

            {/* 提示文字 */}
            <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
              <Smartphone className="w-4 h-4" />
              <span>打开微信 → 扫一扫 → 关注公众号</span>
            </div>

            {/* 刷新按钮 */}
            {(status === "qr_ready" || status === "expired") && (
              <button
                onClick={generateQrCode}
                className="mt-4 text-sm text-blue-500 hover:text-blue-600 transition-colors"
              >
                刷新二维码
              </button>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            登录即表示您同意我们的服务条款和隐私政策
          </p>
        </div>
      </div>
    </div>
  );
}
