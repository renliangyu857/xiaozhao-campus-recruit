import { test, expect } from '@playwright/test';

test.describe('导航与页面', () => {
  test('底部/顶部导航可进入进度统计页', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /进度|统计/ }).first().click();
    await expect(page).toHaveURL(/#\/progress/);
    await expect(page.getByRole('heading', { name: '我的投递看板' })).toBeVisible();
  });

  test('未登录时进度页提示请登录', async ({ page }) => {
    await page.goto('/#/progress');

    await expect(page.getByText(/请登录后查看投递统计/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: '去登录' })).toBeVisible();
  });

  test('导航可进入会员中心页', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /会员中心|会员/ }).first().click();
    await expect(page).toHaveURL(/#\/vip/);
    await expect(
      page.getByText(/Premium Membership|升级会员|当前为普通用户/),
    ).toBeVisible();
  });

  test('会员中心页加载套餐列表', async ({ page }) => {
    await page.goto('/#/vip');

    await expect(
      page.getByText(/月|季|终身|¥|原价/).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('从会员页返回首页', async ({ page }) => {
    await page.goto('/#/vip');
    await expect(page.getByText(/Premium Membership|升级会员/)).toBeVisible();

    await page.getByRole('button', { name: /招聘列表|列表/ }).first().click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole('heading', { name: '最新职位' })).toBeVisible();
  });
});

test.describe('职位卡片与状态', () => {
  test('登录后首页若有职位可切换投递状态下拉框', async ({ page }) => {
    await page.goto('/');

    page.on('dialog', (d) => d.accept('openid_status_' + Date.now()));
    await page.getByRole('button', { name: '微信登录' }).click();
    await expect(page.getByRole('button', { name: '微信登录' })).not.toBeVisible({ timeout: 8_000 });

    const firstCard = page.getByTestId('job-card').first();
    const cardVisible = await firstCard.isVisible().catch(() => false);
    if (!cardVisible) {
      test.skip();
      return;
    }

    const statusSelect = firstCard.locator('select');
    await statusSelect.selectOption('已投递');
    await page.waitForTimeout(500);
    await expect(statusSelect).toHaveValue('已投递');
  });
});
