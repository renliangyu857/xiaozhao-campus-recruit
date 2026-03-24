/**
 * 监控工具集
 * 用于错误追踪、性能监控和用户行为分析
 *
 * 注意：当前已移除官方 Sentry 集成
 * 如需使用其他监控服务，请在此配置
 */

// 类型定义（保持与原 Sentry 接口兼容）
export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

export const monitoring = {
  /**
   * 捕获并上报异常
   */
  captureException: (error: Error, context?: Record<string, unknown>) => {
    // 当前仅记录到控制台
    console.error('[monitoring] Captured exception:', error);
    if (context) {
      console.error('[monitoring] Context:', context);
    }

    // 可以在此添加其他监控服务集成
    // 例如：自建的飞书告警、其他 APM 服务等
  },

  /**
   * 捕获并上报消息
   */
  captureMessage: (message: string, level: SeverityLevel = 'info') => {
    console.log(`[monitoring][${level}] Message: ${message}`);

    // 可以在此添加其他监控服务集成
  },

  /**
   * 设置用户信息（用于关联错误和用户）
   */
  setUser: (user: { id: string; email?: string; username?: string }) => {
    console.log(`[monitoring] Set user: ${user.id} ${user.email || ''}`);
  },

  /**
   * 清除用户信息（用户登出时调用）
   */
  clearUser: () => {
    console.log('[monitoring] Clear user');
  },

  /**
   * 添加面包屑（记录用户操作路径）
   */
  addBreadcrumb: (message: string, category?: string, data?: Record<string, unknown>) => {
    console.log(`[monitoring][breadcrumb] ${category || 'default'}: ${message}`, data || '');
  },

  /**
   * 性能追踪 - 开始事务 (已废弃，保持兼容性)
   */
  startTransaction: (name: string, op: string) => {
    console.warn('[monitoring] startTransaction is deprecated');
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
    console.log(`[monitoring] Business event: ${eventName}`, data || '');

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
    console.error(`[monitoring] API error at ${endpoint}:`, error);
    if (requestData) {
      console.error('[monitoring] Request data:', requestData);
    }
  },

  /**
   * 追踪页面性能
   */
  trackWebVitals: (metric: { name: string; value: number; id: string }) => {
    console.log(`[monitoring] Web Vital: ${metric.name} = ${metric.value} (id: ${metric.id})`);
  },
};

/**
 * 错误边界处理函数
 * 用于 React 错误边界组件
 */
export function handleError(error: Error, errorInfo: React.ErrorInfo) {
  console.error('[monitoring] React error boundary:', error);
  console.error('[monitoring] Component stack:', errorInfo.componentStack);
}

/**
 * 获取最后一个事件 ID
 * 用于显示错误报告对话框
 */
export function getLastEventId(): string | null {
  // 已移除 Sentry，返回 null
  return null;
}

/**
 * 显示用户反馈对话框
 */
export function showFeedbackDialog(eventId?: string) {
  console.warn('[monitoring] showFeedbackDialog is deprecated without Sentry');
}
