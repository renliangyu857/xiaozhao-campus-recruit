import { NextResponse } from 'next/server';
import { monitoring } from '@/lib/monitoring';

/**
 * 监控测试 API
 * 用于验证监控系统是否正确配置
 */
export async function GET() {
  // 测试消息上报
  monitoring.captureMessage('Monitoring test API called', 'info');

  return NextResponse.json({
    status: 'ok',
    monitoring: 'configured',
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
      throw new Error('This is a test error for monitoring');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // 错误会被监控系统捕获
    monitoring.captureException(error as Error);
    return NextResponse.json(
      { error: 'Test error triggered' },
      { status: 500 }
    );
  }
}
