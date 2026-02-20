import { test, expect } from '@playwright/test';

const STUB_CODE = 'openid_e2e_' + Date.now();

test.describe('登录与免费次数', () => {
  test('点击微信登录后自动填入 stub code 并登录成功', async ({ page }) => {
    await page.goto('/');

    // 监听 prompt 并自动接受默认值（stub code）
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept(STUB_CODE);
    });

    await page.getByRole('button', { name: '微信登录' }).click();

    // 登录成功后“微信登录”按钮消失，出现用户区域或 VIP/昵称
    await expect(page.getByRole('button', { name: '微信登录' })).not.toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByText(/免费剩余|VIP|求职|会员/).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('登录后多次查询触发免费次数用尽并出现付费弹层', async ({ page }) => {
    await page.goto('/');

    page.on('dialog', (d) => d.accept(STUB_CODE));
    await page.getByRole('button', { name: '微信登录' }).click();
    await expect(page.getByRole('button', { name: '微信登录' })).not.toBeVisible({ timeout: 8_000 });

    const searchBtn = page.getByRole('button', { name: /查询筛选/ });
    for (let i = 0; i < 4; i++) {
      await searchBtn.click();
      await page.waitForTimeout(800);
    }

    await expect(page.getByText('今日免费次数已用完')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: '立即开通会员' })).toBeVisible();
  });

  test('付费弹层可关闭并跳转会员页', async ({ page }) => {
    await page.goto('/');

    page.on('dialog', (d) => d.accept(STUB_CODE));
    await page.getByRole('button', { name: '微信登录' }).click();
    await expect(page.getByRole('button', { name: '微信登录' })).not.toBeVisible({ timeout: 8_000 });

    const searchBtn = page.getByRole('button', { name: /查询筛选/ });
    for (let i = 0; i < 4; i++) {
      await searchBtn.click();
      await page.waitForTimeout(800);
    }

    await expect(page.getByText('今日免费次数已用完')).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: '立即开通会员' }).click();
    await expect(page).toHaveURL(/#\/vip/);
    await expect(page.getByText(/Premium Membership|升级会员|尊贵的 VIP/)).toBeVisible();
  });
});
