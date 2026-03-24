'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { monitoring } from '@/lib/monitoring';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 上报错误到监控系统
    monitoring.captureException(error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              出错了！
            </h2>

            <p className="text-gray-600 mb-6">
              我们已经记录了这个问题，请稍后重试。
              <br />
              <span className="text-sm text-gray-400">
                错误 ID: {error.digest || 'unknown'}
              </span>
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                重试
              </button>

              <Link
                href="/"
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
