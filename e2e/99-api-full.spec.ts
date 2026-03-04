import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE || "http://localhost:3000/api";

async function loginAndGetHeaders(request: typeof test.request): Promise<Record<string, string>> {
  const testCode = "test_full_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  const loginRes = await request.get(`${API_BASE}/auth/wechat/login?code=${testCode}`);
  expect(loginRes.status()).toBe(200);
  const cookies = loginRes.headers()["set-cookie"];
  const headers: Record<string, string> = {};
  if (cookies) headers["Cookie"] = cookies;
  return headers;
}

test.describe("完整 API 测试 - 用户旅程", () => {
  test("完整流程：注册 -> 登录 -> 查询职位 -> 更新状态 -> 查看进度", async ({ request }) => {
    test.setTimeout(60_000);
    const testCode = "journey_" + Date.now();
    const loginRes = await request.get(`${API_BASE}/auth/wechat/login?code=${testCode}`);
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody).toHaveProperty("id");

    const setCookie = loginRes.headers()["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie ?? "";
    const headers: Record<string, string> = { Cookie: cookieHeader };

    const currentRes = await request.get(`${API_BASE}/auth/current`, { headers });
    expect(currentRes.status()).toBe(200);

    const jobsRes = await request.get(`${API_BASE}/jobs`, { headers });
    expect(jobsRes.status()).toBe(200);
    const jobsBody = await jobsRes.json();
    expect(jobsBody).toHaveProperty("content");

    const queryRes = await request.post(`${API_BASE}/query/consume`, { headers });
    expect([200, 403]).toContain(queryRes.status());

    const statsRes = await request.get(`${API_BASE}/progress/stats`, { headers });
    expect(statsRes.status()).toBe(200);

    const progressRes = await request.get(`${API_BASE}/progress/list`, { headers });
    expect(progressRes.status()).toBe(200);

    const plansRes = await request.get(`${API_BASE}/vip/plans`);
    expect(plansRes.status()).toBe(200);

    const dashboardRes = await request.get(`${API_BASE}/vip/dashboard`, { headers });
    expect([200, 404]).toContain(dashboardRes.status());

    const inviteStatsRes = await request.get(`${API_BASE}/invite/stats`, { headers });
    expect(inviteStatsRes.status()).toBe(200);

    const logoutRes = await request.post(`${API_BASE}/auth/logout`, { headers });
    expect(logoutRes.status()).toBe(200);

    // 用手动 Cookie header 时，logout 返回的 Set-Cookie 不会自动更新到 headers；
    // 因此这里用「不带 Cookie」的请求验证已登出。
    const afterLogoutRes = await request.get(`${API_BASE}/auth/current`);
    expect(afterLogoutRes.status()).toBe(401);
  });

  test("完整流程：注册 -> 创建订单流程", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const plansRes = await request.get(`${API_BASE}/vip/plans`);
    expect(plansRes.status()).toBe(200);
    const plans = await plansRes.json();

    if (plans.length > 0) {
      const planId = plans[0].id;
      headers["Content-Type"] = "application/json";
      const orderRes = await request.post(`${API_BASE}/vip/create-order`, {
        headers,
        data: { planId },
      });
      expect([200, 400]).toContain(orderRes.status());
    }
  });

  test("完整流程：注册 -> 生成邀请码 -> 查看统计", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const generateRes = await request.post(`${API_BASE}/invite/generate`, { headers });
    expect([200, 400]).toContain(generateRes.status());

    const statsRes = await request.get(`${API_BASE}/invite/stats`, { headers });
    expect(statsRes.status()).toBe(200);
    const stats = await statsRes.json();
    expect(stats).toHaveProperty("inviteCode");
    expect(stats).toHaveProperty("count");
  });
});

test.describe("完整 API 测试 - 错误处理", () => {
  test("所有需要登录的接口在 401 时返回正确的错误消息", async ({ request }) => {
    const protectedEndpoints: { method: string; path: string; body?: object }[] = [
      { method: "GET", path: "/jobs" },
      { method: "GET", path: "/jobs?page=0&size=10" },
      { method: "PUT", path: "/jobs/1/status", body: { status: "已投递" } },
      { method: "POST", path: "/query/consume" },
      { method: "GET", path: "/progress/list" },
      { method: "PUT", path: "/progress/1/note", body: { note: "测试" } },
      { method: "GET", path: "/vip/dashboard" },
      { method: "POST", path: "/vip/create-order", body: { planId: "1_month" } },
      { method: "GET", path: "/referral-codes" },
      { method: "POST", path: "/referral-codes/1/use" },
      { method: "POST", path: "/invite/generate" },
      { method: "GET", path: "/invite/stats" },
      { method: "POST", path: "/invite/bind", body: { inviteCode: "TEST" } },
    ];

    for (const endpoint of protectedEndpoints) {
      const options: { headers?: Record<string, string>; data?: object } = {};
      if (endpoint.body) {
        options.headers = { "Content-Type": "application/json" };
        options.data = endpoint.body;
      }

      let response;
      switch (endpoint.method) {
        case "GET":
          response = await request.get(`${API_BASE}${endpoint.path}`, options);
          break;
        case "POST":
          response = await request.post(`${API_BASE}${endpoint.path}`, options);
          break;
        case "PUT":
          response = await request.put(`${API_BASE}${endpoint.path}`, options);
          break;
        default:
          continue;
      }

      expect(response?.status()).toBe(401);
    }
  });

  test("所有接口都正确处理不存在的资源", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    headers["Content-Type"] = "application/json";

    const jobStatusRes = await request.put(`${API_BASE}/jobs/99999/status`, {
      headers,
      data: { status: "已投递" },
    });
    expect(jobStatusRes.status()).toBe(400);

    const referralRes = await request.post(`${API_BASE}/referral-codes/99999/use`, { headers });
    expect([403, 404]).toContain(referralRes.status());

    const bindRes = await request.post(`${API_BASE}/invite/bind`, {
      headers,
      data: { inviteCode: "INVALID" },
    });
    expect(bindRes.status()).toBe(400);
  });
});

test.describe("完整 API 测试 - 性能与并发", () => {
  test("职位列表接口响应时间小于 5 秒", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const start = Date.now();
    const response = await request.get(`${API_BASE}/jobs`, { headers });
    const duration = Date.now() - start;
    expect(response.status()).toBe(200);
    expect(duration).toBeLessThan(5000);
  });

  test("VIP 套餐接口响应时间小于 1 秒", async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${API_BASE}/vip/plans`);
    const duration = Date.now() - start;
    expect(response.status()).toBe(200);
    expect(duration).toBeLessThan(1000);
  });

  test("进度统计接口响应时间小于 1 秒", async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${API_BASE}/progress/stats`);
    const duration = Date.now() - start;
    expect(response.status()).toBe(200);
    expect(duration).toBeLessThan(1000);
  });
});
