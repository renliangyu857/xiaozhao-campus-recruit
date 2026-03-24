# Findings

## 月度会员价格问题

- **问题**：在 `lib/payment-config.ts` 中，月度会员价格配置有问题
- **位置**：第 11-23 行的 `getPrice` 函数
- **原因**：之前返回 `return hasPurchased ? 10 : 10;`，导致无论是否首月购买都是 0.1 元（10分）
- **修复**：修改为 `return hasPurchased ? 990 : 580;`，恢复首月 5.8 元，之后 9.9 元的价格策略

## Sentry 集成问题

- **问题**：用户希望使用项目自己集成的告警 hook，不再使用官方 Sentry 集成
- **分析**：
  - 官方 Sentry 集成在 `lib/monitoring.ts` 中通过 `@sentry/nextjs` 实现
  - 项目自己的告警 hook 在 `app/api/sentry/webhook/route.ts` 中实现
  - 官方 Sentry 集成会增加包体积，并且需要外部服务依赖
- **解决方案**：
  - 删除了官方 Sentry 配置文件
  - 更新了 `lib/monitoring.ts`，移除 Sentry 依赖，保留接口兼容性
  - 修改了相关使用 Sentry 的文件，使用更新后的 `monitoring` 模块
  - 保留了项目自己的告警 hook

## 保留的功能

项目保留了自己实现的告警系统：
- `app/api/sentry/webhook/route.ts` - 接收外部告警（如 GitHub、GitLab、自定义系统）
- 支持发送到飞书群聊和私聊
- 支持各种告警级别和交互式卡片
- 保持与外部系统的兼容性（如 Sentry 格式的 Webhook）

## 性能优化

- 移除了官方 Sentry 的 Webpack 插件配置
- 减少了客户端和服务器端的 bundle 大小
- 简化了依赖关系
