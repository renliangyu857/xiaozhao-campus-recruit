# Findings: 前后端全部重构（Next.js 全栈）

## Scope

- **前端**：React 19 + Vite 6 + Hash 路由 → Next.js（App Router）+ path 路由。
- **后端**：Spring Boot 3.x + JPA + MySQL/PostgreSQL + Redis → Next.js API Routes + Prisma/Drizzle + Redis。
- **E2E**：现有 Playwright UI + API 用例全部保留并跑通，遇错自修。

## 现有后端范围（Phase 1 已梳理）

- **Base URL**: 所有接口在 `context-path: /api` 下，即 `/api/auth/...`、`/api/jobs/...` 等。
- **会话**: Spring Session Redis；Cookie 传递；Controller 通过 `HttpSession` 取 `AuthService.SESSION_USER_ID`（Long）。
- **Auth**: GET /auth/wechat/login?code=, GET /auth/current, POST /auth/logout；登录返回 UserDto，未登录 401。
- **Jobs**: GET /jobs（industry, type, location, deadlineDays, roles, onlyNewToday, page, size；需登录），PUT /jobs/:jobId/status（body: { status }；需登录）。
- **Progress**: GET /progress/stats（可无登录）, GET /progress/list（需登录）, PUT /progress/:jobId/note（body: { note }；需登录）。
- **Query**: POST /query/consume（需登录；返回 allowed + remainingFreeQueries 或 403）。
- **VIP**: GET /vip/dashboard（需登录）, GET /vip/plans（公开）, POST /vip/create-order（body: { planId }；需登录）。
- **Referral**: GET /referral-codes?page=&size=&companyName=（仅会员）, POST /referral-codes/:id/use（仅会员）。
- **Invite**: POST /invite/generate（需登录）, GET /invite/stats（需登录）, POST /invite/bind（body: { inviteCode }；需登录）。
- **Pay**: POST /pay/wechat/notify（XML 请求/响应；微信回调）。
- **数据库**: MySQL（application.yml）；JPA + 实体 Job, User, UserMember, UserJobStatus, UserInvitation, ReferralCode, PaymentOrder 等；Redis 会话。

## 现有前端范围

- 路由：/, /vip, /referral-codes, /exam, /invite, /progress
- 页面：HomePage, VIPPage, ReferralCodesPage, ExamPage, InvitePage, ProgressPage；NavBar
- API：apiClient 使用 /api，credentials: 'include'

## E2E 范围

- UI：01-home, 02-auth-quota, 03-pages
- API：04-api-auth, 05-api-jobs, 06-api-progress, 07-api-vip, 08-api-query, 09-api-invite, 10-api-referral, 11-api-pay, 99-api-full

## 技术决策（Phase 2 补充）

| 决策 | 理由 |
|------|------|
| （待定） | |

## 风险与依赖

- 微信支付回调在 serverless 下的超时/冷启动；评估文档建议回调单独常驻或自建 Node 容器。
- 数据迁移：若沿用现有库，需 schema 与 Prisma/Drizzle 对齐；若新建库，需迁移脚本。
