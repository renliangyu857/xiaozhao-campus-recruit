#!/bin/bash
# 清理旧项目文件脚本
# 用于删除已迁移到 Next.js 的旧 frontend 和 backend 目录

set -e

echo "🧹 开始清理旧项目文件..."

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "项目根目录: $PROJECT_ROOT"

# 检查 frontend 目录
if [ -d "frontend" ]; then
    echo -e "${YELLOW}⚠️  发现 frontend 目录${NC}"
    echo "大小: $(du -sh frontend | cut -f1)"

    # 备份提示
    echo -e "${YELLOW}📦 建议先备份重要文件${NC}"
    read -p "是否继续删除 frontend 目录? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf frontend
        echo -e "${GREEN}✅ frontend 目录已删除${NC}"
    else
        echo -e "${YELLOW}⏭️  跳过 frontend 删除${NC}"
    fi
else
    echo -e "${GREEN}✅ frontend 目录不存在${NC}"
fi

# 检查 backend 目录
if [ -d "backend" ]; then
    echo -e "${YELLOW}⚠️  发现 backend 目录${NC}"
    echo "大小: $(du -sh backend | cut -f1)"

    read -p "是否继续删除 backend 目录? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf backend
        echo -e "${GREEN}✅ backend 目录已删除${NC}"
    else
        echo -e "${YELLOW}⏭️  跳过 backend 删除${NC}"
    fi
else
    echo -e "${GREEN}✅ backend 目录不存在${NC}"
fi

# 清理其他旧文件
echo -e "\n${YELLOW}🧹 清理其他旧文件...${NC}"

# 删除根目录的 hs_err_pid 日志（如果有）
if ls hs_err_pid*.log 1> /dev/null 2>&1; then
    rm -f hs_err_pid*.log
    echo -e "${GREEN}✅ 清理 JVM 错误日志${NC}"
fi

# 删除旧的全局文档（已整合到 next-app/docs）
OLD_DOCS=(
    "在Supabase中建表步骤.md"
    "在Upstash中创建Redis与连接步骤.md"
    "技术实现方案.md"
    "配置与启动说明.md"
    "网站.md"
)

for doc in "${OLD_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${YELLOW}发现旧文档: $doc${NC}"
    fi
done

echo -e "\n${GREEN}🎉 清理完成！${NC}"
echo ""
echo "剩余目录结构:"
ls -la "$PROJECT_ROOT"
