# Sentry 监控配置指南

## 快速开始

### 1. 注册 Sentry 账号

访问 [sentry.io](https://sentry.io) 注册账号

### 2. 创建项目

1. 登录 Sentry → Projects → Create Project
2. 选择平台: Next.js
3. 记录 DSN: `https://xxx@xxx.ingest.sentry.io/xxx`

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local`:

```bash
cp .env.example .env.local
```

填写 Sentry 相关变量：

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=sntrys_xxx  # 可选，用于 CI 上传 source map
```

### 4. 安装依赖

```bash
npm install
```

### 5. 测试 Sentry

本地开发时，Sentry 会自动捕获错误。

访问测试页面验证: `http://localhost:3000/sentry-example-page`

### 6. Vercel 部署

在 Vercel 控制台添加环境变量：

```
NEXT_PUBLIC_SENTRY_DSN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_AUTH_TOKEN  # 用于上传 source map
```

## 功能说明

### 自动捕获的错误类型

- ✅ JavaScript 运行时错误
- ✅ React 组件错误（Error Boundary）
- ✅ API Route 错误
- ✅ 未处理的 Promise 拒绝
- ✅ 资源加载失败

### 手动上报

```typescript
import { monitoring } from '@/lib/monitoring';

// 上报错误
monitoring.captureException(new Error('自定义错误'));

// 上报消息
monitoring.captureMessage('用户完成操作', 'info');

// 设置用户信息
monitoring.setUser({ id: 'user-123', email: 'user@example.com' });

// 追踪业务事件
monitoring.trackBusinessEvent('用户支付成功', { orderId: '123' });
```

### 用户反馈

Sentry 会自动在页面上显示反馈按钮，用户可以：
- 提交错误描述
- 上传截图
- 提供联系方式

## 免费额度

| 功能 | 免费额度 | 说明 |
|------|----------|------|
| 错误事件 | 5,000/月 | 足够小项目使用 |
| 性能单元 | 10M/月 | 性能追踪 |
| 会话回放 | 500/月 | 错误发生时的录屏 |

## 生产环境建议

1. **删除测试页面**: 部署前删除 `app/sentry-example-page/`
2. **调整采样率**: 生产环境可降低 `tracesSampleRate` 到 0.05
3. **过滤敏感信息**: 已在配置中添加，按需调整
4. **设置告警**: Sentry 控制台 → Alerts 配置错误告警

## 故障排查

### Source Map 未上传

确保 `SENTRY_AUTH_TOKEN` 有 `project:releases` 和 `org:read` 权限。

### 本地不报告错误

检查 `NODE_ENV` 是否为 `development`，Sentry 在开发环境也会上报。

### 构建失败

检查 `SENTRY_ORG` 和 `SENTRY_PROJECT` 是否正确。

## 参考链接

- [Sentry Next.js 文档](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry 仪表板](https://sentry.io)
