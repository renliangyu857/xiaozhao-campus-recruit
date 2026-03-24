'use client';

import { useState } from 'react';
import { monitoring } from '@/lib/monitoring';

export default function SentryTestPage() {
  const [result, setResult] = useState<string>('');

  // 测试 1: 触发简单错误（每次都产生新问题）
  const triggerSimpleError = () => {
    const errorId = Math.random().toString(36).substr(2, 9);
    try {
      throw new Error(`这是一个 Sentry 测试错误 - ${errorId}`);
    } catch (error) {
      monitoring.captureException(error as Error, {
        testType: 'simple-error',
        errorId,
        timestamp: new Date().toISOString()
      });
      setResult(`✅ 测试错误 ${errorId} 已上报到 Sentry！`);
    }
  };

  // 测试 2: 上报业务事件
  const sendBusinessEvent = () => {
    monitoring.trackBusinessEvent('sentry-test-event', {
      userId: 'test-user-123',
      action: 'test-button-click',
      timestamp: new Date().toISOString()
    });
    setResult('✅ 业务事件已上报到 Sentry！');
  };

  // 测试 3: 设置用户信息
  const setUserInfo = () => {
    monitoring.setUser({
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'test-user'
    });
    setResult('✅ 用户信息已设置！');
  };

  // 测试 4: 添加面包屑
  const addBreadcrumb = () => {
    monitoring.addBreadcrumb(
      '用户点击了测试按钮',
      'user-action',
      { buttonName: 'sentry-test-button' }
    );
    setResult('✅ 面包屑已添加！');
  };

  // 测试 5: 发送消息
  const sendMessage = () => {
    monitoring.captureMessage('这是一条来自 sentry-test 页面的测试消息', 'info');
    setResult('✅ 消息已发送！');
  };

  // 测试 6: 直接测试飞书告警
  const testFeishuAlert = async () => {
    try {
      const response = await fetch('/api/sentry/webhook?test=1&level=error');
      const data = await response.json();

      if (data.success) {
        setResult('✅ 飞书告警测试成功！');
      } else {
        setResult(`❌ 飞书告警测试失败: ${data.error}`);
      }
    } catch (error) {
      setResult(`❌ 飞书告警测试失败: ${(error as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Sentry 测试页面</h1>
        <p className="text-gray-600 mb-8">用于测试 Sentry 错误监控功能</p>

        <div className="space-y-4">
          <button
            onClick={triggerSimpleError}
            className="w-full p-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            1. 触发简单错误
          </button>

          <button
            onClick={sendBusinessEvent}
            className="w-full p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            2. 发送业务事件
          </button>

          <button
            onClick={setUserInfo}
            className="w-full p-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
          >
            3. 设置用户信息
          </button>

          <button
            onClick={addBreadcrumb}
            className="w-full p-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
          >
            4. 添加面包屑
          </button>

          <button
            onClick={sendMessage}
            className="w-full p-4 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
          >
            5. 发送消息
          </button>

          <button
            onClick={testFeishuAlert}
            className="w-full p-4 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
          >
            6. 测试飞书告警
          </button>
        </div>

        {result && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <p className="text-gray-800">{result}</p>
          </div>
        )}

        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">查看结果</h2>
          <p className="text-gray-700 mb-4">
            点击按钮后，请访问 <a href="https://sentry.io" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">sentry.io</a> 查看上报的错误和事件。
          </p>
          <p className="text-sm text-gray-500">
            提示：您可能需要等待几秒钟，错误才会显示在 Sentry 控制台中。
          </p>
        </div>
      </div>
    </div>
  );
}
