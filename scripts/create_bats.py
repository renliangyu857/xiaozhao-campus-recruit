
# -*- coding: utf-8 -*-
""" 创建正确编码的批处理文件 """

import codecs

# 立即生成.bat
content1 = '''@echo off
chcp 65001 >nul
echo ==========================================================
echo          小红书笔记立即生成
echo ==========================================================

cd /d "%~dp0.."

echo.
echo [1/2] 检查依赖...
if not exist "node_modules\\node-cron" (
    echo 正在安装依赖...
    call npm install
)

echo.
echo [2/2] 开始生成小红书笔记...
echo.

call npm run xhs:generate

echo.
echo.
echo ==========================================================
echo          生成完成！
echo ==========================================================
echo.
echo 生成的内容已保存到: daily_output/xhs-images/
echo.
echo 每个类别包含:
echo   - 4张Notion风格图片
echo   - 笔记文字内容 (note-text.txt)
echo   - 源文件和分析文件
echo.
echo 如需定时运行，请使用"启动定时任务.bat"
echo.

pause
'''

# 启动定时任务.bat
content2 = '''@echo off
chcp 65001 >nul
echo ==========================================================
echo          小红书每日定时任务启动器
echo ==========================================================
echo.
echo [提示] 此脚本将启动定时任务，每天早上10点自动运行
echo [提示] 如需立即测试，请关闭此窗口并运行"立即生成.bat"
echo.
echo 按任意键继续启动定时任务...
pause >nul

cd /d "%~dp0.."

echo.
echo [1/2] 检查依赖...
if not exist "node_modules\\node-cron" (
    echo 正在安装依赖...
    call npm install
)

echo.
echo [2/2] 启动定时任务...
echo.
echo ==========================================================
echo          定时任务已启动
echo ==========================================================
echo 定时时间: 每天 10:00
echo.
echo [提示] 保持此窗口打开，定时任务才会运行
echo [提示] 按 Ctrl+C 可以停止定时任务
echo ==========================================================
echo.

call npm run xhs:schedule

pause
'''

# 保存文件，使用 GBK 编码（Windows 批处理文件需要）
with codecs.open('立即生成.bat', 'w', 'gbk', errors='ignore') as f:
    f.write(content1)

with codecs.open('启动定时任务.bat', 'w', 'gbk', errors='ignore') as f:
    f.write(content2)

print('批处理文件已创建完成！')
print('请使用:')
print('  - 立即生成.bat (立即测试)')
print('  - 启动定时任务.bat (定时任务)')

