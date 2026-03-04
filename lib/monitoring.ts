import * as Sentry from '@sentry/nextjs';

/**
 * 监控工具集
 * 用于错误追踪、性能监控和用户行为分析
 */
export const monitoring = {
  /**
   * 捕获并上报异常
   */
  captureException: (error: Error, context?: Record<string, unknown>) => {
    Sentry.captureException(error, {
      extra: context,
    });
  },

  /**
   * 捕获并上报消息
   */
  captureMessage: (message: string, level: Sentry.SeverityLevel = 'info') => {
    Sentry.captureMessage(message, level);
  },

  /**
   * 设置用户信息（用于关联错误和用户）
   */
  setUser: (user: { id: string; email?: string; username?: string }) => {
    Sentry.setUser(user);
  },

  /**
   * 清除用户信息（用户登出时调用）
   */
  clearUser: () => {
    Sentry.setUser(null);
  },

  /**
   * 添加面包屑（记录用户操作路径）
   */
  addBreadcrumb: (message: string, category?: string, data?: Record<string, unknown>) => {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  },

  /**
   * 性能追踪 - 开始事务 (已废弃，新版 Sentry 使用不同的 API)
   */
  startTransaction: (name: string, op: string) => {
    // Sentry.startTransaction 在新版本中已被移除
    // 返回一个 mock 对象以保持兼容性
    console.warn('startTransaction is deprecated in new Sentry versions');
    return {
      name,
      op,
      finish: () => {},
      setData: () => {},
    };
  },

  /**
   * 业务事件追踪
   * 用于追踪关键业务节点（支付、注册等）
   */
  trackBusinessEvent: (eventName: string, data?: Record<string, unknown>) => {
    // 上报到 Sentry
    Sentry.captureMessage(`Business: ${eventName}`, 'info');

    // 同时添加面包屑
    Sentry.addBreadcrumb({
      message: eventName,
      category: 'business',
      data,
      level: 'info',
    });

    // 可选：同时上报到自建分析
    if (typeof window !== 'undefined') {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: eventName,
          data,
          timestamp: Date.now(),
        }),
      }).catch(() => {
        // 静默失败
      });
    }
  },

  /**
   * 追踪 API 错误
   */
  trackApiError: (endpoint: string, error: unknown, requestData?: unknown) => {
    Sentry.captureException(error, {
      extra: {
        endpoint,
        requestData,
        timestamp: new Date().toISOString(),
      },
      tags: {
        type: 'api_error',
        endpoint,
      },
    });
  },

  /**
   * 追踪页面性能
   */
  trackWebVitals: (metric: { name: string; value: number; id: string }) => {
    Sentry.captureMessage(`Web Vital: ${metric.name}`, {
      level: 'info',
      extra: {
        name: metric.name,
        value: metric.value,
        id: metric.id,
      },
    });
  },
};

/**
 * 错误边界处理函数
 * 用于 React 错误边界组件
 */
export function handleError(error: Error, errorInfo: React.ErrorInfo) {
  Sentry.captureException(error, {
    extra: {
      componentStack: errorInfo.componentStack,
    },
  });
}

/**
 * 获取最后一个事件 ID
 * 用于显示错误报告对话框
 */
export function getLastEventId(): string | null {
  return Sentry.lastEventId() || null;
}

/**
 * 显示用户反馈对话框
 */
export function showFeedbackDialog(eventId?: string) {
  const id = eventId || Sentry.lastEventId();
  if (id) {
    Sentry.showReportDialog({ eventId: id });
  }
}
