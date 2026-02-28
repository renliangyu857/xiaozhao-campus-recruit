#!/bin/bash
# 部署初始化脚本
# 运行方式: bash scripts/setup-deploy.sh

set -e

echo "🚀 初始化部署配置..."

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    echo "请先安装 Node.js 20+: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js 版本过低: $(node -v)${NC}"
    echo "请升级到 Node.js 20+"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本: $(node -v)${NC}"

# 检查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI 未安装，正在安装...${NC}"
    npm install -g vercel
fi

echo -e "${GREEN}✅ Vercel CLI 已安装${NC}"

# 进入 next-app 目录
cd next-app

# 安装依赖
echo -e "${YELLOW}📦 安装依赖...${NC}"
npm install

# 生成 Prisma 客户端
echo -e "${YELLOW}🔄 生成 Prisma 客户端...${NC}"
npx prisma generate

# 检查环境变量
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  未找到 .env.local 文件${NC}"
    echo "请创建 .env.local 文件并配置环境变量："
    echo "  DATABASE_URL=your_supabase_url"
    echo "  UPSTASH_REDIS_URL=your_upstash_url"
    echo "  SESSION_SECRET=your_secret"
fi

# 本地构建测试
echo -e "${YELLOW}🔨 本地构建测试...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 本地构建成功！${NC}"
else
    echo -e "${RED}❌ 本地构建失败，请检查错误${NC}"
    exit 1
fi

# 链接 Vercel 项目
echo -e "${YELLOW}🔗 链接 Vercel 项目...${NC}"
echo "请在浏览器中完成登录授权"
vercel link

# 获取项目信息
if [ -f ../.vercel/project.json ]; then
    ORG_ID=$(cat ../.vercel/project.json | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4)
    PROJECT_ID=$(cat ../.vercel/project.json | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4)

    echo ""
    echo -e "${GREEN}📋 请配置以下 GitHub Secrets:${NC}"
    echo ""
    echo "  VERCEL_TOKEN:     从 https://vercel.com/account/tokens 创建"
    echo "  VERCEL_ORG_ID:    $ORG_ID"
    echo "  VERCEL_PROJECT_ID: $PROJECT_ID"
    echo ""
fi

echo -e "${GREEN}🎉 初始化完成！${NC}"
echo ""
echo "下一步:"
echo "1. 配置 GitHub Secrets"
echo "2. 推送代码到 GitHub: git push origin main"
echo "3. GitHub Actions 将自动部署到 Vercel"
