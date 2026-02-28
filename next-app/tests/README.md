# Webapp Testing 使用指南

本项目使用 `webapp-testing` skill 进行端到端 (E2E) 测试。

## 目录结构

```
tests/
├── README.md                  # 本文档
├── run-e2e-test.bat          # Windows 测试运行脚本
├── run-e2e-test.sh           # Linux/Mac 测试运行脚本
├── e2e/
│   └── campus-recruit-test.py # 主测试脚本
└── test-results/             # 测试结果截图（自动生成）
```

## 快速开始

### 1. Windows 环境

```bash
cd tests
run-e2e-test.bat
```

### 2. Linux/Mac 环境

```bash
cd tests
chmod +x run-e2e-test.sh
./run-e2e-test.sh
```

### 3. 手动运行（已有开发服务器）

如果你已经启动了开发服务器 (`npm run dev`)：

```bash
cd tests
python e2e/campus-recruit-test.py
```

## 测试内容

当前测试脚本包含以下测试用例：

| 测试项 | 说明 |
|--------|------|
| `test_homepage` | 测试首页加载、导航栏、主要内容区域 |
| `test_job_listings` | 测试职位列表页面 |
| `capture_console_logs` | 捕获浏览器控制台日志 |

## 使用 with_server.py 助手

`with_server.py` 会自动管理服务器生命周期：

```bash
python ~/.claude/plugins/cache/anthropic-agent-skills/document-skills/1ed29a03dc85/skills/webapp-testing/scripts/with_server.py \
  --server "npm run dev" \
  --port 3000 \
  --timeout 60 \
  -- python your_test_script.py
```

### 多服务器支持

如果需要同时启动后端和前端：

```bash
python scripts/with_server.py \
  --server "cd backend && npm start" --port 3001 \
  --server "cd frontend && npm run dev" --port 3000 \
  -- python your_test_script.py
```

## 编写测试脚本

参考示例：`~/.claude/plugins/cache/anthropic-agent-skills/document-skills/1ed29a03dc85/skills/webapp-testing/examples/`

### 基本结构

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto('http://localhost:3000')
    page.wait_for_load_state('networkidle')  # 关键：等待 JS 执行完成

    # 你的测试逻辑
    page.screenshot(path='test-results/screenshot.png')

    browser.close()
```

### 常用操作

```python
# 点击元素
page.click('text=登录')

# 填写表单
page.fill('input[name="email"]', 'test@example.com')
page.fill('input[name="password"]', 'password123')

# 等待元素
page.wait_for_selector('button[type="submit"]')

# 获取元素列表
buttons = page.locator('button').all()

# 检查元素可见性
if page.locator('.modal').is_visible():
    print("Modal is visible")
```

## 调试技巧

### 1. 非无头模式（可见浏览器）

```python
browser = p.chromium.launch(headless=False, slow_mo=100)
```

### 2. 查看页面内容

```python
# 获取页面 HTML
content = page.content()
print(content)

# 获取页面文本
text = page.inner_text('body')
print(text)
```

### 3. 使用开发者工具

```python
# 暂停执行，可以在浏览器中打开开发者工具
page.pause()
```

## 参考资源

- [Playwright Python 文档](https://playwright.dev/python/)
- [Locators 指南](https://playwright.dev/python/docs/locators)
- [Assertions 指南](https://playwright.dev/python/docs/test-assertions)
