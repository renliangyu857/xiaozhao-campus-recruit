import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/**
 * Sentry 测试 API
 * 用于验证 Sentry 是否正确配置
 */
export async function GET() {
  // 测试消息上报
  Sentry.captureMessage('Sentry test API called', 'info');

  return NextResponse.json({
    status: 'ok',
    sentry: 'configured',
    timestamp: new Date().toISOString(),
  });
}

/**
 * 故意抛出错误（测试用）
 * 访问 /api/sentry-example-api?error=1 触发
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.triggerError) {
      throw new Error('This is a test error for Sentry');
    }

    return NextResponse.json({ success: true });
  } catch {
    // 错误会自动被 Sentry 捕获
    return NextResponse.json(
      { error: 'Test error triggered' },
      { status: 500 }
    );
  }
}
