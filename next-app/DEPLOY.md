# 校招信息聚合站 - 完整部署文档

**部署方案**: Vercel + EdgeOne + Supabase + Upstash
**成本**: 约 ¥10/月（仅域名费用）
**适用场景**: 无服务器、自动扩缩容、国内访问加速

---

## 📋 目录

1. [架构概览](#架构概览)
2. [前置准备](#前置准备)
3. [Vercel 部署](#vercel-部署)
4. [EdgeOne 加速配置](#edgeone-加速配置)
5. [GitHub Actions 自动部署](#github-actions-自动部署)
6. [环境变量配置](#环境变量配置)
7. [验证与测试](#验证与测试)
8. [故障排查](#故障排查)

---

## 架构概览

```
用户访问
    ↓
腾讯云 EdgeOne（国内边缘节点）
    ├── 静态资源（JS/CSS/图片）→ 边缘缓存
    ├── HTML 页面 → 短期缓存
    └── API 请求 → 回源到 Vercel
              ↓
         Vercel（香港 Region: hkg1）
              ├── Next.js 全栈应用
              └── API Routes
              ↓
         Supabase（PostgreSQL）
         Upstash（Redis）
```

**成本明细**:
| 服务 | 费用 | 说明 |
|------|------|------|
| Vercel Hobby | ¥0 | 无限流量，100GB/月带宽 |
| EdgeOne 个人版 | ¥0 | 10GB/月流量，100万次请求 |
| Supabase 免费版 | ¥0 | 500MB 数据库，2GB 存储 |
| Upstash 免费版 | ¥0 | 10,000 请求/天 |
| 域名 | ¥5-10/月 | .com/.cn 域名 |

---

## 前置准备

### 1. 必需账号

- [ ] [GitHub](https://github.com) 账号
- [ ] [Vercel](https://vercel.com) 账号（建议用 GitHub 登录）
- [ ] [腾讯云](https://cloud.tencent.com) 账号
- [ ] 域名（阿里云/腾讯云/GoDaddy 购买）

### 2. 项目结构调整

确保你的项目结构如下：

```
nextjs-campusrecruit/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions 配置
├── next-app/               # Next.js 应用目录
│   ├── app/
│   ├── lib/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
│   └── ...
├── vercel.json             # Vercel 部署配置
├── DEPLOY.md               # 本文档
└── README.md
```

---

## Vercel 部署

### 1. 创建 Vercel 配置文件

在项目根目录创建 `vercel.json`：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd next-app && npm run build",
  "outputDirectory": "next-app/.next",
  "installCommand": "cd next-app && npm ci",
  "framework": "nextjs",
  "regions": ["hkg1"],
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

### 2. 优化 Next.js 配置

修改 `next-app/next.config.ts`：

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,

  // 图片优化配置
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },

  // 跨域配置
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },

  // 重定向配置（如有需要）
  async redirects() {
    return [];
  },
};

export default nextConfig;
```

### 3. 更新 package.json

确保 `next-app/package.json` 有以下脚本：

```json
{
  "name": "campus-recruit-next",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.19.2",
    "ioredis": "^5.9.3",
    "lucide-react": "^0.575.0",
    "next": "16.1.6",
    "react": "^19",
    "react-dom": "^19",
    "recharts": "^2.15.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "prisma": "^6.19.2",
    "typescript": "^5"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### 4. 创建系统文件

#### .vercelignore
```
.github/
.vscode/
.idea/
*.log
.env.local
.env.development
.env.test
frontend/
backend/
crawl/
docs/
.next/
node_modules/
```

#### .nvmrc
```
20.11.0
```

---

## EdgeOne 加速配置

### 1. 添加站点

1. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
2. 点击「添加站点」
3. 输入你的域名（如 `your-domain.com`）
4. 选择「个人版」（免费）

### 2. 修改 DNS 解析

在域名注册商处，将 NS 记录修改为 EdgeOne 提供的地址：

```
类型: NS
主机记录: @
记录值: ns1.edgeone.qcloud.com

类型: NS
主机记录: @
记录值: ns2.edgeone.qcloud.com
```

等待 5-15 分钟生效。

### 3. 配置源站

在 EdgeOne 控制台 → 域名管理 → 添加域名：

```yaml
加速域名: www.your-domain.com
源站配置:
  源站类型: HTTP
  源站地址: your-project.vercel.app  # Vercel 分配的域名
  回源协议: HTTPS
  回源 HOST: your-project.vercel.app
```

### 4. 配置缓存规则

在「规则引擎」中添加以下规则：

#### 规则 1: 静态资源长期缓存
```yaml
规则名称: 静态资源缓存
匹配条件:
  - 类型: URL 路径
    运算符: 包含
    值: /_next/static/
操作:
  - 类型: 节点缓存 TTL
    值: 365 天
  - 类型: 浏览器缓存 TTL
    值: 365 天
```

#### 规则 2: API 不缓存
```yaml
规则名称: API 不缓存
匹配条件:
  - 类型: URL 路径
    运算符: 包含
    值: /api/
操作:
  - 类型: 节点缓存 TTL
    值: 不缓存
```

#### 规则 3: HTML 短期缓存
```yaml
规则名称: HTML 缓存
匹配条件:
  - 类型: 文件后缀
    运算符: 等于
    值: html
操作:
  - 类型: 节点缓存 TTL
    值: 60 秒
  - 类型: 浏览器缓存 TTL
    值: 不缓存
```

### 5. HTTPS 配置

在「SSL/TLS」中：
- 开启「边缘证书」（自动申请 Let's Encrypt）
- 加密模式：「严格」
- 始终使用 HTTPS：开启

---

## GitHub Actions 自动部署

### 1. 创建 Workflow 文件

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Vercel

on:
  push:
    branches:
      - main
      - master
  pull_request:
    branches:
      - main
      - master

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  # 代码检查
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: next-app/package-lock.json

      - name: Install dependencies
        run: |
          cd next-app
          npm ci

      - name: Run linter
        run: |
          cd next-app
          npm run lint || true

  # 测试（如有）
  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: next-app/package-lock.json

      - name: Install dependencies
        run: |
          cd next-app
          npm ci

      # - name: Run tests
      #   run: |
      #     cd next-app
      #     npm test

  # 部署到 Vercel
  deploy:
    runs-on: ubuntu-latest
    needs: [lint, test]
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master')

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: next-app/package-lock.json

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}

  # 部署预览（PR）
  deploy-preview:
    runs-on: ubuntu-latest
    needs: [lint, test]
    if: github.event_name == 'pull_request'

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: next-app/package-lock.json

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project Artifacts
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy Project Artifacts to Vercel
        id: deploy
        run: |
          DEPLOY_URL=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "deploy_url=$DEPLOY_URL" >> $GITHUB_OUTPUT

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 预览部署完成: ${{ steps.deploy.outputs.deploy_url }}'
            })
```

### 2. 配置 GitHub Secrets

在 GitHub 仓库 → Settings → Secrets and variables → Actions 中添加：

| Secret | 获取方式 |
|--------|----------|
| `VERCEL_TOKEN` | Vercel 控制台 → Settings → Tokens → Create Token |
| `VERCEL_ORG_ID` | `vercel orgs list` 命令获取 |
| `VERCEL_PROJECT_ID` | 项目根目录 `.vercel/project.json` 中的 `projectId` |

**获取步骤：**

```bash
# 1. 登录 Vercel
npx vercel login

# 2. 链接项目（在项目根目录）
cd nextjs-campusrecruit
npx vercel link

# 3. 查看 project.json
cat .vercel/project.json
# 输出: {"orgId":"xxx","projectId":"yyy"}
```

---

## 环境变量配置

### 1. Vercel 环境变量

在 Vercel 控制台 → Project Settings → Environment Variables 中添加：

```
DATABASE_URL=postgresql://postgres.xxx:password@xxx.supabase.co:5432/postgres
UPSTASH_REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
SESSION_SECRET=your-random-secret-min-32-characters-long
NEXT_PUBLIC_APP_URL=https://www.your-domain.com
```

**注意**：
- `NEXT_PUBLIC_` 前缀的变量会在客户端暴露
- 修改环境变量后需要重新部署

### 2. 本地开发环境变量

创建 `next-app/.env.local`：

```env
# 数据库
DATABASE_URL="postgresql://postgres.xxx:password@xxx.supabase.co:5432/postgres"

# Redis
UPSTASH_REDIS_URL="rediss://default:xxx@xxx.upstash.io:6379"

# Session
SESSION_SECRET="dev-secret-key-change-in-production"

# 应用配置
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 验证与测试

### 1. 检查部署状态

```bash
# 查看 Vercel 部署日志
npx vercel logs --url https://your-project.vercel.app

# 或者访问 Vercel 控制台
https://vercel.com/dashboard
```

### 2. 测试 EdgeOne 加速

```bash
# 测试首页
curl -I https://www.your-domain.com

# 检查响应头，应包含：
# edge-one: cache
# edge-one: hit / miss

# 测试静态资源
curl -I https://www.your-domain.com/_next/static/xxx.js
# 应返回: cache-control: max-age=31536000
```

### 3. 性能测试

```bash
# 使用 curl 测试响应时间
curl -o /dev/null -s -w "%{time_total}\n" https://www.your-domain.com

# 期望结果:
# 首次访问: < 1s
# 缓存命中: < 100ms
```

---

## 故障排查

### 问题 1: Build 失败

**现象**: GitHub Actions 中 build 步骤失败

**解决**:
```bash
# 本地测试构建
cd next-app
npm ci
npm run build

# 检查 Prisma 生成
npx prisma generate
npx prisma db push
```

### 问题 2: 数据库连接失败

**现象**: API 返回 500，日志显示数据库错误

**解决**:
1. 检查 Vercel 环境变量 `DATABASE_URL` 是否正确
2. 检查 Supabase 数据库是否允许外部连接
3. 检查连接池配置：
   ```
   DATABASE_URL="postgresql://...?connection_limit=5&pool_timeout=10"
   ```

### 问题 3: EdgeOne 不缓存

**现象**: 每次请求都回源到 Vercel

**解决**:
1. 检查 EdgeOne 缓存规则是否生效
2. 检查响应头是否有 `cache-control: no-cache`
3. 清除 EdgeOne 缓存：
   ```
   EdgeOne 控制台 → 缓存刷新 → 输入 URL → 刷新
   ```

### 问题 4: 冷启动慢

**现象**: 首次访问 API 慢（2-3秒）

**解决**:
1. 使用 EdgeOne 缓存 HTML 页面
2. 使用 Vercel Pro 的 "Edge Functions"（付费）
3. 优化数据库查询，使用连接池

---

## 更新部署

### 正常更新流程

```bash
# 1. 本地修改代码

# 2. 提交到 GitHub
git add .
git commit -m "feat: xxx"
git push origin main

# 3. 自动部署
# GitHub Actions 会自动触发部署

# 4. 查看部署状态
# https://github.com/your-repo/actions
```

### 强制重新部署

```bash
# 清空 EdgeOne 缓存
# EdgeOne 控制台 → 缓存刷新 → 全部刷新

# 重新部署 Vercel
npx vercel --prod
```

---

## 前端监控配置

### Sentry 错误监控（推荐）

Sentry 提供免费的错误监控、性能追踪和会话回放功能。

#### 1. 注册与配置

1. 访问 [Sentry](https://sentry.io) 注册账号
2. 创建新项目 → 选择 Next.js
3. 记录 DSN：`https://xxx@xxx.ingest.sentry.io/xxx`

#### 2. 安装 SDK

```bash
cd next-app
npm install @sentry/nextjs
```

#### 3. 配置文件

创建 `next-app/sentry.client.config.ts`：

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',

  // 性能采样
  tracesSampleRate: 0.1,

  // 会话回放
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // 过滤敏感信息
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers['cookie'];
      delete event.request.headers['authorization'];
    }
    return event;
  },
});
```

创建 `next-app/sentry.server.config.ts`：

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
  tracesSampleRate: 0.1,
});
```

创建 `next-app/sentry.edge.config.ts`：

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
  tracesSampleRate: 0.1,
});
```

#### 4. 更新 Next.js 配置

```typescript
// next-app/next.config.ts
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ... 原有配置
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring-tunnel',
  hideSourceMaps: true,
  disableLogger: true,
});
```

#### 5. 添加环境变量

Vercel 环境变量：

```
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=sntrys_xxx  # 用于上传 source map
```

#### 6. 错误边界组件

创建 `next-app/app/global-error.tsx`：

```tsx
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <h2>出错了！</h2>
          <p>我们已经记录了这个问题，请稍后重试</p>
          <button onClick={reset}>重试</button>
        </div>
      </body>
    </html>
  );
}
```

#### 7. 监控工具函数

创建 `next-app/lib/monitoring.ts`：

```typescript
import * as Sentry from '@sentry/nextjs';

export const monitoring = {
  // 捕获异常
  captureException: (error: Error, context?: Record<string, any>) => {
    Sentry.captureException(error, { extra: context });
  },

  // 设置用户信息
  setUser: (user: { id: string; email?: string }) => {
    Sentry.setUser(user);
  },

  // 清除用户
  clearUser: () => {
    Sentry.setUser(null);
  },

  // 性能追踪
  startTransaction: (name: string, op: string) => {
    return Sentry.startTransaction({ name, op });
  },
};
```

#### 8. 免费额度

| 功能 | 免费额度 |
|------|----------|
| 错误事件 | 5,000/月 |
| 性能单元 | 10M/月 |
| 会话回放 | 500/月 |

---

### 自建轻量监控（备选）

如果 Sentry 额度不够用，可用 Supabase 自建：

```sql
CREATE TABLE error_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64),
  error_name VARCHAR(256),
  error_message TEXT,
  error_stack TEXT,
  url TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
```

API 接收端：`app/api/log-error/route.ts`

---

### 监控告警配置

#### Sentry 告警规则

1. 登录 Sentry → Alerts → Create Alert Rule
2. 配置条件：
   - When: `Number of errors` is `above` 10 in 1 minute
   - Then: Send notification to Email

#### 关键指标阈值

| 指标 | 告警阈值 |
|------|----------|
| 错误率 | > 1% |
| P95 响应时间 | > 1s |
| LCP (Core Web Vitals) | > 2.5s |

---

## 监控与维护

### Vercel Analytics（免费）

```typescript
// next-app/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
      <Analytics />
    </html>
  );
}
```

### 自建简单监控

在 Supabase 中创建监控表：

```sql
-- 访问日志表
CREATE TABLE access_logs (
  id SERIAL PRIMARY KEY,
  path TEXT,
  method TEXT,
  status_code INT,
  response_time INT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 慢查询索引
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);
```

---

## 总结

### 部署检查清单

- [ ] GitHub 代码已推送
- [ ] Vercel 项目已创建
- [ ] GitHub Secrets 已配置
- [ ] EdgeOne 站点已添加
- [ ] DNS 已切换到 EdgeOne
- [ ] 缓存规则已配置
- [ ] HTTPS 证书已申请
- [ ] 网站访问正常
- [ ] API 响应正常
- [ ] Sentry 监控已配置（可选）
- [ ] 错误告警已设置（可选）

### 成本总结

| 项目 | 月成本 |
|------|--------|
| 域名 | ¥5-10 |
| Vercel | ¥0 |
| EdgeOne | ¥0 |
| Supabase | ¥0 |
| Upstash | ¥0 |
| **总计** | **¥5-10** |

### 性能预期

| 指标 | 目标 |
|------|------|
| 首字节时间 (TTFB) | < 500ms |
| 首次内容绘制 (FCP) | < 1.5s |
| 静态资源加载 | < 100ms (缓存命中) |
| API 响应 | < 300ms |

---

**文档版本**: v1.0
**最后更新**: 2026-02-27
**维护者**: Your Name
