#!/bin/bash
# ========================================
# 校园招聘平台 E2E 测试脚本
# Campus Recruit Platform E2E Tests
# ========================================

echo "========================================"
echo "校园招聘平台 E2E 测试"
echo "Campus Recruit Platform E2E Tests"
echo "========================================"

# 确保测试目录存在
mkdir -p test-results

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$HOME/.claude/plugins/cache/anthropic-agent-skills/document-skills/1ed29a03dc85/skills/webapp-testing"

echo ""
echo "Starting Next.js dev server and running tests..."
echo ""

# 使用 with_server.py 启动 Next.js 开发服务器并运行测试
python "$SKILL_DIR/scripts/with_server.py" \
  --server "cd $SCRIPT_DIR/.. && npm run dev" \
  --port 3000 \
  --timeout 180 \
  -- python "$SCRIPT_DIR/e2e/campus-recruit-test.py"

echo ""
echo "========================================"
echo "Test run completed!"
echo "Check test-results/ directory for screenshots"
echo "========================================"
