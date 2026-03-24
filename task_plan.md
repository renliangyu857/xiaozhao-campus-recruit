# Task Plan

## Goal
1. 保留 Sentry 官方集成用于错误追踪和排错
2. 项目自己集成告警 hook 用于飞书通知
3. 月度会员价格恢复到 5.8
4. 检查并修复 eslint 错误
5. 修复 VIP 价格显示问题
6. 添加直接测试飞书告警的功能

## Phases
| Phase | Status | Notes |
|---|---|---|
| 1. 理解用户需求 | complete | 用户需要保留 Sentry 用于排错，告警通过飞书发送 |
| 2. 恢复 Sentry 官方集成 | complete | 从 git 历史恢复 Sentry 相关文件和代码 |
| 3. 保留项目自己的告警 hook | complete | 保留 app/api/sentry/webhook/route.ts 用于飞书通知 |
| 4. 月度会员价格恢复到 5.8 | complete | 已在 lib/payment-config.ts 中完成 |
| 5. 检查并修复 eslint 错误 | complete | 修复了 lib/monitoring.ts 中 eventId 未使用的错误 |
| 6. 修复 VIP 价格显示问题 | complete | 修复了 app/api/vip/plans/route.ts，现在调用真实的 getProductPrice 函数 |
| 7. 添加直接测试飞书告警的功能 | complete | 在 app/sentry-test/page.tsx 中添加了「测试飞书告警」按钮 |
| 8. 提交并推送代码 | in_progress | 将最终修改提交到仓库 |

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| 理解偏差 | 1 | 初次误解了用户需求，以为要完全移除 Sentry |
| eventId 未使用 | 2 | 从 git 历史恢复了完整的 lib/monitoring.ts 文件，修复了 eslint 错误 |
| VIP 价格显示 0.1 元 | 3 | 发现 app/api/vip/plans/route.ts 中价格是硬编码的，修改为调用 getProductPrice 函数 |
