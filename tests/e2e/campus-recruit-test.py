"""
校园招聘平台 E2E 测试脚本
使用 Playwright 测试核心功能流程
"""
from playwright.sync_api import sync_playwright
import sys

def test_homepage():
    """测试首页加载"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 访问首页
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')

        # 截图保存
        page.screenshot(path='test-results/homepage.png', full_page=True)

        # 验证页面标题
        title = page.title()
        print(f"Page title: {title}")

        # 检查关键元素是否存在
        try:
            # 检查导航栏
            nav = page.locator('nav').first
            if nav.is_visible():
                print("✓ Navigation bar found")
            else:
                print("✗ Navigation bar not found")

            # 检查主要内容区域
            main = page.locator('main').first
            if main.is_visible():
                print("✓ Main content area found")
            else:
                print("✗ Main content area not found")

        except Exception as e:
            print(f"Error checking elements: {e}")

        browser.close()
        print("Homepage test completed!")

def test_job_listings():
    """测试职位列表页面"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto('http://localhost:3000/jobs')
        page.wait_for_load_state('networkidle')

        page.screenshot(path='test-results/jobs-page.png', full_page=True)

        # 检查职位列表
        job_cards = page.locator('[data-testid="job-card"]').all()
        print(f"Found {len(job_cards)} job cards")

        browser.close()
        print("Job listings test completed!")

def capture_console_logs():
    """捕获控制台日志"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 监听控制台消息
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"{msg.type}: {msg.text}"))

        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')

        # 等待几秒收集日志
        page.wait_for_timeout(2000)

        print("\nConsole Logs:")
        for log in console_logs:
            print(log)

        browser.close()

if __name__ == "__main__":
    import os
    os.makedirs('test-results', exist_ok=True)

    print("=" * 50)
    print("Starting Campus Recruit Platform Tests")
    print("=" * 50)

    print("\n1. Testing Homepage...")
    test_homepage()

    print("\n2. Testing Job Listings...")
    test_job_listings()

    print("\n3. Capturing Console Logs...")
    capture_console_logs()

    print("\n" + "=" * 50)
    print("All tests completed!")
    print("=" * 50)
