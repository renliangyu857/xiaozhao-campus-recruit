import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 环境
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',

  // 调整采样率
  tracesSampleRate: 0.1, // 性能追踪采样率

  // 会话回放采样率
  replaysSessionSampleRate: 0.01, // 1% 的会话会被录制
  replaysOnErrorSampleRate: 1.0, // 错误发生时 100% 录制

  // 集成
  integrations: [
    Sentry.replayIntegration({
      // 不屏蔽文本（可以根据需求调整）
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.feedbackIntegration({
      // 用户反馈按钮
      colorScheme: 'system',
    }),
  ],

  // 过滤敏感信息
  beforeSend(event) {
    // 移除敏感请求头
    if (event.request?.headers) {
      delete event.request.headers['cookie'];
      delete event.request.headers['authorization'];
    }
    // 移除敏感用户数据
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },

  // 忽略常见非错误
  ignoreErrors: [
    // 浏览器插件相关
    'top.GLOBALS',
    '原始 postMessage',
    '无法获取属性',
    // 网络错误
    'Failed to fetch',
    'NetworkError',
    'AbortError',
    // 第三方脚本
    /^Non-Error promise rejection/,
  ],

  // 调试（仅开发环境）
  debug: process.env.NODE_ENV === 'development',
});
