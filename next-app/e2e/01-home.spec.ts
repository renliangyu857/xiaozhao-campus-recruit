import { test, expect } from "@playwright/test";

const STUB_CODE = "openid_home_" + Date.now();

test.describe("首页 - 招聘列表与筛选", () => {
  test("未登录时加载首页并显示最新职位区域", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "校招信息，一站搞定" })).toBeVisible();
    await expect(page.getByRole("button", { name: "查询筛选" })).toBeVisible();
  });

  test("行业筛选选择互联网后点击查询筛选", async ({ page }) => {
    await page.goto("/");
    page.on("dialog", (d) => d.accept(STUB_CODE));
    await page.getByRole("button", { name: "微信登录" }).click();
    await expect(page.getByRole("button", { name: "微信登录" })).not.toBeVisible({ timeout: 15_000 });
    const industrySelect = page.locator("select").first();
    await industrySelect.selectOption("互联网");
    await page.getByRole("button", { name: "查询筛选" }).click();
    await expect(
      page.getByTestId("job-card").first().or(page.getByText("暂无相关职位"))
    ).toBeVisible({ timeout: 25_000 });
  });

  test("工作地点输入北京后点击查询筛选", async ({ page }) => {
    await page.goto("/");
    page.on("dialog", (d) => d.accept(STUB_CODE));
    await page.getByRole("button", { name: "微信登录" }).click();
    await expect(page.getByRole("button", { name: "微信登录" })).not.toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder("工作地点").fill("北京");
    await page.getByRole("button", { name: "查询筛选" }).click();
    await expect(
      page.getByTestId("job-card").first().or(page.getByText("暂无相关职位"))
    ).toBeVisible({ timeout: 25_000 });
  });

  test("类型选择秋招、截止选择7天内后点击查询", async ({ page }) => {
    await page.goto("/");
    page.on("dialog", (d) => d.accept(STUB_CODE));
    await page.getByRole("button", { name: "微信登录" }).click();
    await expect(page.getByRole("button", { name: "微信登录" })).not.toBeVisible({ timeout: 15_000 });
    const selects = page.locator("select");
    await selects.nth(1).selectOption("秋招");
    await selects.nth(2).selectOption("7");
    await page.getByRole("button", { name: "查询筛选" }).click();
    await expect(
      page.getByTestId("job-card").first().or(page.getByText("暂无相关职位"))
    ).toBeVisible({ timeout: 25_000 });
  });

  test("今日新增开关可点击", async ({ page }) => {
    await page.goto("/");
    const todayBtn = page.getByRole("button", { name: "今日新增" });
    await todayBtn.click();
    await expect(todayBtn).toHaveClass(/bg-red-50|border-red-200/);
  });
});
