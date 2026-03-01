import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 环境
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // 性能追踪采样率
  tracesSampleRate: 0.1,

  // 调试（仅开发环境）
  debug: process.env.NODE_ENV === 'development',
});
