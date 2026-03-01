import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE || "http://localhost:3000/api";

test.describe("API - 认证相关接口", () => {
  test("GET /auth/current 未登录返回 401", async ({ request }) => {
    const response = await request.get(`${API_BASE}/auth/current`);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe("未登录");
  });

  test("GET /auth/wechat/login 缺少 code 返回 400", async ({ request }) => {
    const response = await request.get(`${API_BASE}/auth/wechat/login`);
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toContain("缺少 code");
  });

  test("GET /auth/wechat/login 使用测试 code 登录成功", async ({ request }) => {
    const testCode = "test_openid_" + Date.now();
    const response = await request.get(`${API_BASE}/auth/wechat/login?code=${testCode}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("nickname");
    expect(body).toHaveProperty("isVip");
  });

  test("POST /auth/logout 登出成功", async ({ request }) => {
    const testCode = "test_logout_" + Date.now();
    const loginRes = await request.get(`${API_BASE}/auth/wechat/login?code=${testCode}`);
    expect(loginRes.status()).toBe(200);
    const cookies = loginRes.headers()["set-cookie"];
    const headers: Record<string, string> = {};
    if (cookies) headers["Cookie"] = cookies;
    const logoutRes = await request.post(`${API_BASE}/auth/logout`, { headers });
    expect(logoutRes.status()).toBe(200);
    const body = await logoutRes.json();
    expect(body.message).toBe("已登出");
  });
});

test.describe("API - 登录后获取当前用户信息", () => {
  test("登录后可以获取当前用户信息", async ({ request }) => {
    const testCode = "test_current_" + Date.now();
    const loginRes = await request.get(`${API_BASE}/auth/wechat/login?code=${testCode}`);
    expect(loginRes.status()).toBe(200);
    const cookies = loginRes.headers()["set-cookie"];
    const headers: Record<string, string> = {};
    if (cookies) headers["Cookie"] = cookies;
    const currentRes = await request.get(`${API_BASE}/auth/current`, { headers });
    expect(currentRes.status()).toBe(200);
    const body = await currentRes.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("nickname");
  });
});
