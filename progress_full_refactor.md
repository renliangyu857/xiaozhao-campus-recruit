# Progress: 前后端全部重构（Next.js 全栈）

## Session: 2026-02-26

### Phase 1: Requirements & Discovery
- **Status:** complete
- Actions: 新开全栈重构规划；梳理后端 8 个 Controller、前端 6 页与 services、E2E 列表；写入 findings。
- Files: task_plan_full_refactor.md, findings_full_refactor.md, progress_full_refactor.md.

### Phase 2 & 3: Planning + Backend 迁移
- **Status:** complete
- Actions: 创建 next-app（create-next-app）；Prisma 6 + MySQL schema（app_user, job, user_job_status, user_member, user_invitation, referral_code）；实现全部 API 路由（auth, jobs, progress, query, vip, invite, referral-codes, pay）；Cookie 会话（lib/session.ts）；npm run build 通过。
- Files: next-app/* (app/api/*, lib/*, prisma/schema.prisma).

### Phase 4: Frontend 迁移（页面与布局）
- **Status:** complete
- Actions: layout 使用 UserProvider + AppShell；首页 app/page.tsx（筛选、职位列表、JobCard、收藏、分页、付费墙）；app/vip、app/progress、app/invite、app/referral-codes、app/exam 全部迁移（VIP 套餐与权益、进度看板与图表、邀请有礼、内推码列表、笔面试资料）；lib/panExportService 使用相对路径 /pan-export.txt；ApiError.body 类型断言修复；apiClient body 可空修复。next-app npm run build 通过。
- Files: next-app/app/layout.tsx, next-app/app/page.tsx, next-app/app/vip/page.tsx, next-app/app/progress/page.tsx, next-app/app/invite/page.tsx, next-app/app/referral-codes/page.tsx, next-app/app/exam/page.tsx, next-app/lib/panExportService.ts, next-app/lib/apiClient.ts.

### Phase 5: E2E 配置（next-app）
- **Status:** 已配置，待本地/CI 跑通
- Actions: 在 next-app 中新增 @playwright/test；新增 playwright.config.ts（webServer 启动 next dev、chromium + api 两 project）、playwright.api.config.ts（仅 API、不启动 webServer）；e2e 目录下迁移 01~03（UI）、04~11 与 99（API），API_BASE 使用 E2E_API_BASE 或 http://localhost:3000/api；01~03 适配 Next 路径（/progress、/vip）与文案；09 邀请统计断言改为 inviteCode/count；07 创建订单断言接受 orderId；新增 e2e/README.md、npm scripts e2e / e2e:ui / e2e:api。
- 运行方式：先 `npm run dev`（需 DATABASE_URL），再 `npm run e2e:api`；或直接 `npm run e2e`（自动起 Next，需 3000 端口与 DB）。

### 测试结果（Phase 5 时填写）

| 套件 | 结果 | 备注 |
|------|------|------|
| 01-home.spec.ts | 待运行 | 需 Next + DB |
| 02-auth-quota.spec.ts | 待运行 | 需 Next + DB |
| 03-pages.spec.ts | 待运行 | 需 Next + DB |
| 04~11, 99 api | 待运行 | 需 Next + DB，e2e:api 已配置 |

### Error Log

| 时间 | 错误 | 尝试 | 处理 |
|------|------|------|------|
|  |  | 1 |  |
