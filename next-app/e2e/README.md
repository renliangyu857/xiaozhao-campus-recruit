# E2E 测试说明

## 前置条件

- **Next 应用**：需先启动并可用（`npm run dev`，默认 http://localhost:3000）
- **数据库**：配置 `DATABASE_URL`（PostgreSQL），否则 API 会报错
- **数据库迁移**：若 `user_job_status` 表缺少 `note` 列，需执行 `npx prisma migrate deploy` 或手动添加列
- **环境变量**（可选）：
  - `E2E_API_BASE`：API 根地址，默认 `http://localhost:3000/api`
  - `PLAYWRIGHT_BASE_URL`：UI 测试 baseURL，默认 `http://localhost:3000`

## 命令

```bash
# 1. 启动 Next（在 next-app 目录）
npm run dev

# 2. 仅跑 API 测试（不启动 webServer，依赖已运行的 Next）
npm run e2e:api

# 3. 跑全部 E2E（会自动启动 Next，需端口 3000 空闲）
npm run e2e

# 4. 仅跑 UI 用例（会启动 Next）
npm run e2e:ui
```

## 用例说明

| 文件 | 类型 | 说明 |
|------|------|------|
| 01-home.spec.ts | UI | 首页筛选、查询、今日新增 |
| 02-auth-quota.spec.ts | UI | 微信登录、免费次数、付费墙 |
| 03-pages.spec.ts | UI | 导航、进度页、会员页 |
| 04-api-auth.spec.ts | API | 认证、登录、登出、当前用户 |
| 05-api-jobs.spec.ts | API | 职位列表、筛选、状态更新 |
| 06-api-progress.spec.ts | API | 进度统计、列表、笔记 |
| 07-api-vip.spec.ts | API | VIP 套餐、仪表盘、创建订单 |
| 08-api-query.spec.ts | API | 查询次数消耗 |
| 09-api-invite.spec.ts | API | 邀请码生成、统计、绑定 |
| 10-api-referral.spec.ts | API | 内推码列表、使用 |
| 11-api-pay.spec.ts | API | 微信支付回调 |
| 99-api-full.spec.ts | API | 完整流程与错误处理 |

## 配置

- **playwright.config.ts**：主配置，含 webServer（`npm run dev`）、chromium + api 两个 project
- **playwright.api.config.ts**：仅 API 用例，不启动 webServer，用于在已运行 Next 时执行 `npm run e2e:api`
