@echo off
chcp 65001 >nul
echo ========================================
echo 校园招聘平台 E2E 测试
echo Campus Recruit Platform E2E Tests
echo ========================================

REM 确保测试目录存在
if not exist test-results mkdir test-results

REM 使用 with_server.py 启动 Next.js 开发服务器并运行测试
echo.
echo Starting Next.js dev server and running tests...
echo.

python "%USERPROFILE%\.claude\plugins\cache\anthropic-agent-skills\document-skills\1ed29a03dc85\skills\webapp-testing\scripts\with_server.py" ^
  --server "cd .. && npm run dev" ^
  --port 3000 ^
  --timeout 180 ^
  -- python e2e/campus-recruit-test.py

echo.
echo ========================================
echo Test run completed!
echo Check test-results/ directory for screenshots
echo ========================================
