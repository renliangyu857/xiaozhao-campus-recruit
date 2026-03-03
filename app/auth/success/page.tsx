"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const nickname = searchParams.get("nickname") || "用户";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">登录成功</h1>
        <p className="text-gray-600 mb-6">
          欢迎回来，<span className="font-medium text-gray-900">{nickname}</span>
        </p>

        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-700">
            您已成功登录，请在电脑端继续使用。
          </p>
        </div>

        <p className="text-xs text-gray-400">
          您可以关闭此页面
        </p>
      </div>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
