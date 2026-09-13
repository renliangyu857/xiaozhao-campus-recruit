"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Smartphone, Loader2, CheckCircle, KeyRound } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

interface WechatLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 公众号验证码登录弹窗
 * 流程：扫码关注公众号 → 在公众号发送「登录」→ 收到 6 位验证码 → 网页输入完成登录
 */
export function WechatLoginModal({ isOpen, onClose, onSuccess }: WechatLoginModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const submit = async () => {
    if (loading || success) return;
    const c = code.trim();
    if (!/^\d{6}$/.test(c)) {
      setError("请输入 6 位数字验证码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiFetch("/auth/code/login", { json: { code: c } });
      setSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode("");
    setError("");
    setLoading(false);
    setSuccess(false);
    onClose();
  };

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
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">微信登录</h2>
            <p className="text-gray-500 mt-2">扫码关注公众号，发送「登录」获取验证码</p>
          </div>

          <div className="flex flex-col items-center">
            {/* 公众号二维码（静态图） */}
            <div className="w-52 h-52 bg-white rounded-xl border-2 border-gray-100 flex items-center justify-center overflow-hidden">
              <Image
                src="/wechat-mp-qrcode.jpg"
                alt="公众号二维码"
                width={200}
                height={200}
                className="object-contain"
                priority
              />
            </div>

            {/* 操作步骤 */}
            <ol className="mt-5 w-full space-y-1.5 text-sm text-gray-600 list-none">
              <li className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-xs flex items-center justify-center font-medium">1</span>
                打开微信，扫码关注公众号
              </li>
              <li className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-xs flex items-center justify-center font-medium">2</span>
                在公众号发送<span className="text-blue-600 font-medium">「登录」</span>获取验证码
              </li>
              <li className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-xs flex items-center justify-center font-medium">3</span>
                在下方输入验证码，点击登录
              </li>
            </ol>

            {/* 验证码输入 */}
            <div className="mt-5 w-full">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                  placeholder="请输入 6 位数字验证码"
                  disabled={loading || success}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
              </div>
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

              <button
                onClick={submit}
                disabled={loading || success}
                className="mt-3 w-full py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {success && <CheckCircle className="w-4 h-4" />}
                {success ? "登录成功" : "登录"}
              </button>
            </div>

            {/* 提示 */}
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <Smartphone className="w-3.5 h-3.5" />
              <span>验证码 5 分钟内有效，仅可使用一次</span>
            </div>
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
