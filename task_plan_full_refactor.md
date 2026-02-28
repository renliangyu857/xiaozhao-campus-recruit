# Task Plan: 前后端全部重构（Next.js 全栈 + 完整 E2E）

<!--
  WHAT: 将现有「React+Vite 前端 + Spring Boot 后端」整体重构为 Next.js 全栈应用，并完成完整 E2E 测试。
  WHY: 技术栈统一、便于云部署与迭代；遇问题按 3-Strike 自修并记录。
  WHEN: 新开规划，独立于网盘资料任务；每完成一阶段更新本文件。
-->

## Goal

前后端全部重构：前端由 React+Vite 迁移至 Next.js（App Router），后端由 Spring Boot 迁移至 Next.js API Routes + Node 数据层（Prisma/MySQL 或 PostgreSQL）；保持现有业务能力（登录、职位、进度、VIP、邀请、内推码、支付等）；完成并稳定运行全部 E2E 测试，遇到失败按 3-Strike 协议自我修复并记录。

## Current Phase

Phase 4: Frontend 迁移（Next 页面与组件）

## Phases

### Phase 1: Requirements & Discovery
- [x] 梳理现有后端：Controller、Service、Entity、API 路径与请求/响应格式
- [x] 梳理现有前端：页面、路由、services、状态、与后端对接方式
- [x] 梳理 E2E：UI 用例（01/02/03）、API 用例（04~11、99）、Playwright 配置
- [ ] 确定数据层选型：MySQL + Prisma；Redis 会话方案（Phase 2 定）
- [ ] 确定微信/支付在 Next 下的实现方式（见 docs/Next.js全栈重构与云部署评估.md）
- [x] 将结论与风险写入 findings_full_refactor.md
- **Status:** complete

### Phase 2: Planning & Structure
- [x] 确定 Next.js 项目结构：app/、API 路由与数据层目录、shared 类型
- [x] 设计 API 与 DB：每个现有 Spring 接口对应 Next API Route；数据模型与迁移策略
- [x] 设计会话与鉴权：无状态 + Redis/Session 存储（先 Cookie 签名，后续可加 Redis）
- [ ] 设计 E2E：webServer 启动 Next；API 测试 baseURL 指向 Next /api
- **Status:** complete

### Phase 3: Backend 迁移（Next API + 数据层）
- [x] 初始化 Next 项目（根级 next-app）
- [x] 接入数据层：Prisma 6 + MySQL
- [x] 逐模块迁移 API：auth、jobs、progress、vip、query、invite、referral-codes、pay
- [x] 实现会话（Cookie 签名）
- **Status:** complete

### Phase 4: Frontend 迁移（Next 页面与组件）
- [ ] 迁移页面与布局、路由、services、全局状态
- [ ] 静态资源、Tailwind、与现有风格一致
- **Status:** pending

### Phase 5: E2E 与自修
- [ ] Playwright 指向 Next；运行全部 E2E；按 3-Strike 修复并记录
- **Status:** pending

### Phase 6: Delivery
- [ ] 更新 README、配置与启动说明；清理或归档原 backend/frontend
- **Status:** pending

## Key Questions

1. 数据库是否沿用现有 MySQL/PostgreSQL 实例？
2. 微信支付回调是否单独部署常驻服务？
3. 原 backend 与 frontend 目录是删除、备份还是保留参考？

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| （Phase 2 填写） | |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| Prisma 7 schema url no longer supported | 1 | 改用 Prisma 6.x，保留 schema 内 datasource url |
| NextResponse.notFound() 不存在 | 1 | 改为 new NextResponse(null, { status: 404 }) |
| findUnique where id+isValid 非唯一 | 1 | 仅 where: { id }，再判断 ref.isValid |

## Notes

- 本规划与「网盘资料搜索展示」的 task_plan.md 独立。
- 遵循 planning-with-files：每阶段更新；错误必记且不重复同一失败操作。
