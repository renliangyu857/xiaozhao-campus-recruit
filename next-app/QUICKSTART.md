# 🚀 快速部署指南

**预计时间**: 30 分钟
**成本**: ¥0/月（仅域名费用约 ¥10/年）

---

## 部署架构

```
用户 → EdgeOne（国内加速）→ Vercel（香港）→ Supabase/Upstash
```

---

## 第一步：准备工作（5分钟）

### 1.1 注册账号

- [ ] [GitHub](https://github.com) - 代码托管
- [ ] [Vercel](https://vercel.com) - 用 GitHub 登录
- [ ] [腾讯云](https://cloud.tencent.com) - EdgeOne 加速
- [ ] 购买域名（阿里云/腾讯云/GoDaddy）

### 1.2 准备环境变量

从现有项目获取：

```bash
# 数据库连接（Supabase）
DATABASE_URL="postgresql://postgres.xxx@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Redis（Upstash）
UPSTASH_REDIS_URL="rediss://default.xxx@xxx.upstash.io:6379"

# Session 密钥（随机生成）
SESSION_SECRET="your-random-secret-min-32-characters"
```

---

## 第二步：GitHub 配置（5分钟）

### 2.1 推送代码

```bash
# 在项目根目录
git init
git add .
git commit -m "init: project setup"
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

### 2.2 配置 Secrets

进入 GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret

| Secret | 值 | 获取方式 |
|--------|-----|----------|
| `VERCEL_TOKEN` | `vercel_token_xxx` | [Vercel Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `team_xxx` | 见下方命令 |
| `VERCEL_PROJECT_ID` | `prj_xxx` | 见下方命令 |

**获取 ORG_ID 和 PROJECT_ID：**

```bash
# 本地安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 链接项目（在项目根目录）
vercel link

# 查看项目信息
cat .vercel/project.json
# {"orgId":"team_xxx","projectId":"prj_xxx"}
```

---

## 第三步：Vercel 配置（5分钟）

### 3.1 导入项目

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 导入你的 GitHub 仓库

### 3.2 配置构建设置

| 配置项 | 值 |
|--------|-----|
| Framework Preset | Next.js |
| Root Directory | `next-app` |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

### 3.3 添加环境变量

在 Vercel 项目设置 → Environment Variables：

```
DATABASE_URL=postgresql://...
UPSTASH_REDIS_URL=rediss://...
SESSION_SECRET=your-secret
NODE_ENV=production

# 可选：Sentry 监控（推荐）
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

### 3.4 部署

点击 "Deploy"，等待构建完成。

**部署成功后：**
- 获得 Vercel 域名：`https://your-project.vercel.app`
- 访问测试是否正常

---

## 第四步：EdgeOne 加速配置（10分钟）

### 4.1 添加站点

1. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
2. 点击 "添加站点"
3. 输入你的域名（如 `your-domain.com`）
4. 选择 "个人版"（免费）

### 4.2 修改 DNS

在域名注册商处，将 NS 记录修改为：

```
ns1.edgeone.qcloud.com
ns2.edgeone.qcloud.com
```

等待 5-15 分钟生效。

### 4.3 配置源站

在 EdgeOne → 域名管理 → 添加域名：

```yaml
加速域名: www.your-domain.com
源站配置:
  源站类型: HTTP
  源站地址: your-project.vercel.app  # Vercel 分配的域名
  回源协议: HTTPS
```

### 4.4 配置缓存规则

创建三条规则：

**规则 1 - 静态资源缓存：**
```
匹配: URL 路径包含 `/_next/static/`
操作: 节点缓存 TTL = 365 天
```

**规则 2 - API 不缓存：**
```
匹配: URL 路径包含 `/api/`
操作: 节点缓存 TTL = 不缓存
```

**规则 3 - HTML 短期缓存：**
```
匹配: 文件后缀 = html
操作: 节点缓存 TTL = 60 秒
```

### 4.5 开启 HTTPS

- SSL/TLS 模式：「严格」
- 边缘证书：自动申请
- 始终使用 HTTPS：开启

---

## 第五步：验证部署（5分钟）

### 5.1 检查网站访问

```bash
# 测试首页
curl -I https://www.your-domain.com

# 应返回:
# HTTP/2 200
# edge-one: cache
```

### 5.2 检查缓存生效

```bash
# 首次访问（miss）
curl -I https://www.your-domain.com | grep edge-one
# edge-one: miss

# 再次访问（hit）
curl -I https://www.your-domain.com | grep edge-one
# edge-one: hit
```

### 5.3 测试 API

```bash
curl https://www.your-domain.com/api/health
# 应返回健康状态
```

---

## 第六步：添加监控（可选，推荐）

### 6.1 Sentry 错误监控（5分钟）

1. 注册 [Sentry](https://sentry.io) → 创建 Next.js 项目
2. 获取 DSN：`https://xxx@xxx.ingest.sentry.io/xxx`
3. 安装 SDK：
   ```bash
   cd next-app
   npm install @sentry/nextjs
   ```
4. 创建配置文件：
   ```typescript
   // next-app/sentry.client.config.ts
   import * as Sentry from '@sentry/nextjs';
   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     tracesSampleRate: 0.1,
     replaysOnErrorSampleRate: 1.0,
   });
   ```
5. 在 Vercel 添加环境变量 `NEXT_PUBLIC_SENTRY_DSN`
6. 推送代码自动部署

**免费额度**：5,000 错误/月，足够小项目使用

---

## 后续更新

### 自动部署

推送到 GitHub 后自动部署：

```bash
git add .
git commit -m "feat: new feature"
git push origin main

# GitHub Actions 自动触发部署
# 查看进度: https://github.com/your-repo/actions
```

### 手动部署

```bash
# 本地部署到 Vercel
vercel --prod

# 刷新 EdgeOne 缓存
# EdgeOne 控制台 → 缓存刷新 → 输入 URL
```

---

## 故障排查

| 问题 | 解决 |
|------|------|
| 网站 404 | 检查 Vercel Build 是否成功 |
| API 500 | 检查环境变量是否配置正确 |
| 访问慢 | 检查 EdgeOne 缓存规则是否生效 |
| 部署失败 | 查看 GitHub Actions 日志 |

---

## 成本汇总

| 服务 | 费用/月 |
|------|---------|
| Vercel Hobby | ¥0 |
| EdgeOne 个人版 | ¥0 (10GB/月) |
| Supabase 免费版 | ¥0 (500MB) |
| Upstash 免费版 | ¥0 (10K/天) |
| Sentry 免费版 | ¥0 (5K 错误/月) |
| 域名 | ¥1 (.com约¥10/年) |
| **总计** | **¥1/月** |

---

**完成！** 🎉 你的网站现在部署完成并开启了国内加速。

详细文档请查看 [DEPLOY.md](./DEPLOY.md)
