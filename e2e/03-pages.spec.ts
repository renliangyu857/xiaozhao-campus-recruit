import { test, expect } from "@playwright/test";

test.describe("导航与页面", () => {
  test("底部/顶部导航可进入进度统计页", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /进度/ }).first().click();
    await expect(page).toHaveURL(/\/(progress|progress\/?)$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "我的投递看板" }).or(page.getByRole("heading", { name: "请先登录" }))
    ).toBeVisible({ timeout: 20_000 });
  });

  test("未登录时进度页提示请登录", async ({ page }) => {
    await page.goto("/progress");
    await expect(page.getByText(/请先登录/)).toBeVisible({ timeout: 5_000 });
  });

  test("导航可进入会员中心页", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /会员/ }).first().click();
    await expect(page).toHaveURL(/\/(vip|vip\/?)$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /升级会员|升级 VIP/ })).toBeVisible({ timeout: 20_000 });
  });

  test("会员中心页加载套餐列表", async ({ page }) => {
    await page.goto("/vip");
    await expect(page.getByText(/月|季|终身|¥|原价/).first()).toBeVisible({ timeout: 10_000 });
  });

  test("从会员页返回首页", async ({ page }) => {
    await page.goto("/vip");
    await expect(page.getByRole("heading", { name: /升级会员|升级 VIP/ })).toBeVisible({ timeout: 20_000 });
    // 等待页面完全加载后再点击
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: /职位查询/ }).first().click();
    // 增加超时时间应对慢导航
    await expect(page).toHaveURL(/\/(\?.*)?$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "校招信息，一站搞定" })).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("职位卡片与状态", () => {
  test("登录后首页若有职位可切换投递状态下拉框", async ({ page }) => {
    await page.goto("/");
    page.on("dialog", (d) => d.accept("openid_status_" + Date.now()));
    await page.getByRole("button", { name: "微信登录" }).click();
    await expect(page.getByRole("button", { name: "微信登录" })).not.toBeVisible({ timeout: 8_000 });
    const firstCard = page.getByTestId("job-card").first();
    const cardVisible = await firstCard.isVisible().catch(() => false);
    if (!cardVisible) {
      test.skip();
      return;
    }
    const statusSelect = firstCard.locator("select");
    await statusSelect.selectOption("已投递");
    await page.waitForTimeout(500);
    await expect(statusSelect).toHaveValue("已投递");
  });
});
