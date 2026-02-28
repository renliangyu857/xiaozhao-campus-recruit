# CampusRecruit Next.js 全栈应用

本目录为校招信息聚合站的 **Next.js 全栈** 实现，替代原 React+Vite 前端 + Spring Boot 后端。

## 环境要求

- Node 20+
- **数据库**：Supabase（PostgreSQL），与 backend 使用同一套配置（见 `backend/src/main/resources/application-supabase.yml`）
- **Redis**（可选）：Upstash，与 backend 使用同一套配置（见 `backend/src/main/resources/application-upstash.yml`）；当前 Next 会话为 Cookie 存储，Redis 仅预留用于后续扩展

## 配置

1. 复制环境变量并填写：

```bash
cp .env.example .env.local
```

2. 在 `.env.local` 中设置：

- `DATABASE_URL`：Supabase（PostgreSQL）连接串，格式见 `.env.example`；可从 backend 的 `application-supabase.yml` 或 Supabase Dashboard → Database 获取
- `SESSION_SECRET`：会话签名密钥（建议 32 字符以上）
- `UPSTASH_REDIS_URL`（可选）：Upstash Redis TLS URL，与 backend 的 `application-upstash.yml` 中 `spring.data.redis.url` 一致
- 可选：`MAX_FREE_QUERIES`，默认 3

## 如何启动运行

### 开发环境（本地跑起来）

在项目根目录下进入 `next-app`，按顺序执行：

```bash
cd next-app

# 1. 安装依赖（首次或 package.json 变更后）
npm install

# 2. 生成 Prisma Client（必做）
npx prisma generate

# 3. 数据库（二选一）
# 若 Supabase 里已有 backend 建好的表，可直接下一步；
# 若需用 Prisma 建表或同步 schema，执行：
npx prisma db push
# 或使用迁移：npx prisma migrate deploy

# 4. 启动开发服务器
npm run dev
```

浏览器访问 **http://localhost:3000**。

### 生产环境

```bash
cd next-app
npm install
npx prisma generate
npx prisma migrate deploy   # 或 db push，视部署策略
npm run build
npm run start
```

默认监听 3000 端口；如需改端口可设置环境变量 `PORT=3001`。

## 开发

日常开发只需在配置好 `.env.local` 后执行：

```bash
npm run dev
```

## API 与数据库

- 所有 API 在 `/api` 下，路径与原 Spring Boot 一致（如 `/api/auth/wechat/login`、`/api/jobs` 等）。
- 会话通过 Cookie 签名存储，无需 Redis 即可运行；`UPSTASH_REDIS_URL` 已预留，可与 backend 共用 Upstash 配置。
- 表结构见 `prisma/schema.prisma`，与现有 JPA 实体对应（app_user、job、user_job_status、user_member、user_invitation、referral_code）。

## E2E 测试

后端 API 已就绪，可与原仓库中的 Playwright E2E 配合使用：

- 启动本应用：`cd next-app && npm run dev`（端口 3000）
- 在项目根目录或 frontend 中运行 E2E 时，将 API 基地址设为 `http://localhost:3000/api`（原为 `http://localhost:8080/api`）

前端页面迁移（Phase 4）完成后，将在此处补充完整 E2E 说明。
