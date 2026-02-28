# 校招信息聚合站

一个面向应届生的校园招聘信息聚合平台，帮助求职者高效获取校招信息、投递进度管理和内推码分享。

## 🚀 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: PostgreSQL (Supabase)
- **缓存**: Redis (Upstash)
- **部署**: Vercel + EdgeOne (国内加速)
- **监控**: Sentry (错误追踪)

## 📁 项目结构

```
nextjs-campusrecruit/
├── next-app/              # Next.js 主应用
│   ├── app/               # App Router 路由
│   ├── components/        # React 组件
│   ├── lib/               # 工具函数
│   ├── prisma/            # 数据库 Schema
│   ├── public/            # 静态资源
│   ├── app/               # API 路由
│   ├── DEPLOY.md          # 部署文档
│   ├── QUICKSTART.md      # 快速开始
│   └── SENTRY_SETUP.md    # Sentry 配置
├── .github/workflows/     # GitHub Actions
├── scripts/               # 脚本工具
├── docs/                  # 项目文档
├── vercel.json            # Vercel 配置
└── README.md              # 本文档
```

## 🛠️ 快速开始

### 1. 环境准备

```bash
# Node.js 20+
node -v  # v20.x.x

# 安装依赖
cd next-app
npm install
```

### 2. 环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
DATABASE_URL="postgresql://..."
UPSTASH_REDIS_URL="rediss://..."
SESSION_SECRET="your-secret"
```

### 3. 数据库初始化

```bash
npx prisma generate
npx prisma db push
```

### 4. 本地开发

```bash
npm run dev
```

访问 http://localhost:3000

## 📚 文档

- [部署指南](./next-app/DEPLOY.md) - Vercel + EdgeOne 部署
- [快速开始](./next-app/QUICKSTART.md) - 30分钟部署上线
- [Sentry 配置](./next-app/SENTRY_SETUP.md) - 错误监控配置

## 🚀 部署

项目已配置 GitHub Actions 自动部署到 Vercel：

1. 推送代码到 GitHub
2. 自动触发部署
3. EdgeOne 国内加速

详细步骤见 [DEPLOY.md](./next-app/DEPLOY.md)

## 💰 成本

| 服务 | 费用/月 |
|------|---------|
| Vercel Hobby | ¥0 |
| EdgeOne 个人版 | ¥0 (10GB/月) |
| Supabase 免费版 | ¥0 (500MB) |
| Upstash 免费版 | ¥0 (10K/天) |
| Sentry 免费版 | ¥0 (5K 错误/月) |
| 域名 | ¥1-10 |
| **总计** | **¥1-10/月** |

## 📝 更新日志

### 2026-02-27
- ✅ 项目迁移到 Next.js 16
- ✅ 配置 Vercel + EdgeOne 部署
- ✅ 集成 Sentry 错误监控
- ✅ 删除旧 frontend/backend 目录

## 📄 License

MIT
