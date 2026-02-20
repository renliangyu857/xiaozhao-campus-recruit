import { test, expect } from '@playwright/test';

test.describe('首页 - 招聘列表与筛选', () => {
  test('未登录时加载首页并显示最新职位区域', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '最新职位' })).toBeVisible();
    await expect(page.getByText(/共找到/)).toBeVisible();
  });

  test('行业筛选选择互联网后点击查询筛选', async ({ page }) => {
    await page.goto('/');

    const industrySelect = page.locator('select').first();
    await industrySelect.selectOption('互联网');

    await page.getByRole('button', { name: /查询筛选/ }).click();

    // 等待请求完成：要么有卡片，要么显示“暂无相关职位”
    await expect(
      page.getByTestId('job-card').first().or(page.getByText('暂无相关职位')),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('工作地点输入北京后点击查询筛选', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder('工作地点').fill('北京');
    await page.getByRole('button', { name: /查询筛选/ }).click();

    await expect(
      page.getByTestId('job-card').first().or(page.getByText('暂无相关职位')),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('类型选择秋招、截止选择7天内后点击查询', async ({ page }) => {
    await page.goto('/');

    const selects = page.locator('select');
    await selects.nth(1).selectOption('秋招');
    await selects.nth(2).selectOption('7');

    await page.getByRole('button', { name: /查询筛选/ }).click();

    await expect(
      page.getByTestId('job-card').first().or(page.getByText('暂无相关职位')),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('今日新增开关可点击', async ({ page }) => {
    await page.goto('/');

    const todayBtn = page.getByRole('button', { name: /今日新增/ });
    await todayBtn.click();
    await expect(todayBtn).toHaveClass(/bg-red-50|border-red-200/);
  });
});
