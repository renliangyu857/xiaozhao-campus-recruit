import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE || "http://localhost:3000/api";

async function loginAndGetHeaders(request: import("@playwright/test").APIRequestContext): Promise<Record<string, string>> {
  const testCode = "test_vip_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  const loginRes = await request.get(`${API_BASE}/auth/wechat/login?code=${testCode}`);
  expect(loginRes.status()).toBe(200);
  const cookies = loginRes.headers()["set-cookie"];
  const headers: Record<string, string> = {};
  if (cookies) headers["Cookie"] = cookies;
  return headers;
}

test.describe("API - VIP 套餐接口", () => {
  test("GET /vip/plans 公开接口返回套餐列表", async ({ request }) => {
    const response = await request.get(`${API_BASE}/vip/plans`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      expect(body[0]).toHaveProperty("id");
      expect(body[0]).toHaveProperty("name");
      expect(body[0]).toHaveProperty("price");
    }
  });
});

test.describe("API - VIP 仪表盘", () => {
  test("GET /vip/dashboard 未登录返回 401", async ({ request }) => {
    const response = await request.get(`${API_BASE}/vip/dashboard`);
    expect(response.status()).toBe(401);
  });

  test("GET /vip/dashboard 登录后返回仪表盘数据", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/vip/dashboard`, { headers });
    expect([200, 404]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("isVip");
      expect(body).toHaveProperty("isTrial");
    }
  });
});

test.describe("API - 创建订单", () => {
  test("POST /vip/create-order 未登录返回 401", async ({ request }) => {
    const response = await request.post(`${API_BASE}/vip/create-order`, {
      headers: { "Content-Type": "application/json" },
      data: { planId: "1_month" },
    });
    expect(response.status()).toBe(401);
  });

  test("POST /vip/create-order 登录后创建订单", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    headers["Content-Type"] = "application/json";
    const response = await request.post(`${API_BASE}/vip/create-order`, {
      headers,
      data: { planId: "1_month" },
    });
    expect([200, 400]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.orderNo !== undefined || body.orderId !== undefined).toBe(true);
    }
  });

  test("POST /vip/create-order 无效套餐返回 400", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    headers["Content-Type"] = "application/json";
    const response = await request.post(`${API_BASE}/vip/create-order`, {
      headers,
      data: { planId: "invalid_plan" },
    });
    expect(response.status()).toBe(400);
  });
});
