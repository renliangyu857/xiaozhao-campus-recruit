import { test, expect } from "@playwright/test";

// 查询接口较慢（串行请求 consume + getCurrentUser + jobs 需要 6-12s），增加测试超时
test.describe.configure({ timeout: 120_000 });

test.describe("登录与免费次数", () => {
  test("点击微信登录后自动填入 stub code 并登录成功", async ({ page }) => {
    const stubCode = "openid_e2e_login_" + Date.now();
    await page.goto("/");
    page.on("dialog", async (dialog) => {
      expect(dialog.type()).toBe("prompt");
      await dialog.accept(stubCode);
    });
    await page.getByRole("button", { name: "微信登录" }).click();
    await expect(page.getByRole("button", { name: "微信登录" })).not.toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/免费剩余|VIP|会员/).first()).toBeVisible({ timeout: 5_000 });
  });

  test("登录后多次查询触发免费次数用尽并出现付费弹层", async ({ page }) => {
    const stubCode = "openid_e2e_quota_" + Date.now();
    await page.goto("/");
    page.on("dialog", (d) => d.accept(stubCode));
    await page.getByRole("button", { name: "微信登录" }).click();
    await expect(page.getByRole("button", { name: "微信登录" })).not.toBeVisible({ timeout: 15_000 });
    const searchBtn = page.getByRole("button", { name: /查询筛选/ });
    for (let i = 0; i < 4; i++) {
      await searchBtn.click();
      // 等待查询完成（按钮从"查询中..."变回"查询筛选"）
      await expect(page.getByRole("button", { name: "查询筛选" })).toBeVisible({ timeout: 25_000 });
    }
    await expect(page.getByText("今日免费次数已用完")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "立即开通会员" })).toBeVisible();
  });

  test("付费弹层可关闭并跳转会员页", async ({ page }) => {
    const stubCode = "openid_e2e_paywall_" + Date.now();
    await page.goto("/");
    page.on("dialog", (d) => d.accept(stubCode));
    await page.getByRole("button", { name: "微信登录" }).click();
    await expect(page.getByRole("button", { name: "微信登录" })).not.toBeVisible({ timeout: 15_000 });
    const searchBtn = page.getByRole("button", { name: /查询筛选/ });
    for (let i = 0; i < 4; i++) {
      await searchBtn.click();
      // 等待查询完成（按钮从"查询中..."变回"查询筛选"）
      await expect(page.getByRole("button", { name: "查询筛选" })).toBeVisible({ timeout: 25_000 });
    }
    await expect(page.getByText("今日免费次数已用完")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "立即开通会员" }).click();
    // 等待导航完成，增加超时时间应对慢加载
    await page.waitForURL(/\/(vip|vip\/?)$/, { timeout: 30_000 });
    // 会员页标题可能加载较慢，使用更宽松的断言
    await expect(page.getByRole("heading", { name: /升级会员|升级 VIP/ })).toBeVisible({ timeout: 20_000 });
  });
});
