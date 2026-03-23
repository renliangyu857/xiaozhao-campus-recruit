# Sentry 使用指南

## 📋 配置状态
- **已配置**: Sentry SaaS (sentry.io)
- **DSN**: 已在 `.env.production` 中设置
- **版本**: @sentry/nextjs v9.3.0

## 🚀 使用方法

### 1. 自动错误捕获

Sentry 会自动捕获以下错误：

#### 前端错误
- JavaScript 运行时错误
- React 组件错误（通过全局错误边界）
- API 调用失败
- 资源加载失败

#### 后端错误
- API 路由错误
- 服务器端渲染 (SSR) 错误
- 数据库查询错误

### 2. 测试 Sentry

#### 方法 1：测试 API
```bash
# 测试消息上报
curl -X GET "http://localhost:3000/api/sentry-example-api"

# 测试错误捕获
curl -X POST "http://localhost:3000/api/sentry-example-api" \
  -H "Content-Type: application/json" \
  -d '{"triggerError": true}'
```

#### 方法 2：测试页面（需要创建）
创建简单的测试页面：`app/sentry-test/page.tsx`

### 3. 手动错误上报

在代码中手动上报错误和事件：

```typescript
import { monitoring } from '@/lib/monitoring';

// 1. 捕获异常
try {
  throw new Error('自定义错误');
} catch (error) {
  monitoring.captureException(error as Error, {
    user: 'user-123',
    action: 'submit-form'
  });
}

// 2. 上报消息（业务事件）
monitoring.captureMessage('用户完成支付', 'info');

// 3. 设置用户信息
monitoring.setUser({
  id: '123',
  email: 'user@example.com',
  username: 'username'
});

// 4. 添加面包屑（记录用户操作路径）
monitoring.addBreadcrumb(
  '点击了提交按钮',
  'user-action',
  { buttonId: 'submit-btn' }
);

// 5. 业务事件追踪
monitoring.trackBusinessEvent('payment-success', {
  orderId: '12345',
  amount: 100,
  paymentMethod: 'wechat'
});
```

### 4. 查看 Sentry 控制台

访问 [Sentry.io](https://sentry.io) 查看：

#### 🔍 错误详情
1. **Issues**: 所有未处理的错误
2. **Replays**: 错误发生时的录屏
3. **Performance**: 页面加载和 API 性能
4. **Users**: 用户分布和受影响用户数量

#### 📊 重要指标
- **错误频率**: 多久发生一次
- **影响范围**: 多少用户受到影响
- **用户信息**: 用户名、邮箱、IP（已脱敏）
- **发生环境**: 生产/测试/开发

### 5. 生产环境配置

#### 🔧 环境变量
在生产环境（Vercel）中，需要设置：
```bash
NEXT_PUBLIC_SENTRY_DSN=your-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-token  # 用于上传 source map
```

#### 🎯 性能优化
可以调整采样率（在 `sentry.client.config.ts` 中）：
```typescript
// 降低采样率以减少网络流量
tracesSampleRate: 0.05,  // 5% 性能追踪
replaysSessionSampleRate: 0.005,  // 0.5% 会话回放
replaysOnErrorSampleRate: 1.0,  // 错误时 100% 录屏
```

### 6. 常见问题

#### ❓ 为什么看不到错误？
- **检查环境**: 确保在生产环境中（或配置了开发环境上报）
- **DSN 正确性**: 验证 `NEXT_PUBLIC_SENTRY_DSN`
- **网络连接**: 检查防火墙和网络连接
- **用户权限**: Sentry 项目是否有访问权限

#### ❓ 如何忽略特定错误？
在 `sentry.client.config.ts` 中添加：
```typescript
ignoreErrors: [
  'Top-level uncaught error',
  /^Non-Error promise rejection: /
]
```

#### ❓ 如何过滤敏感信息？
在 `sentry.client.config.ts` 的 `beforeSend` 方法中添加过滤逻辑。

## 📚 更多信息

- **官方文档**: [Sentry Next.js 文档](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- **项目配置**: `lib/monitoring.ts`、`sentry.client.config.ts`
- **部署指南**: `SENTRY_SETUP.md`
