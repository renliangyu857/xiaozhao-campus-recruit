import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE || "http://localhost:3000/api";

async function loginAndGetHeaders(request: { get: (url: string, opts?: { headers?: Record<string, string> }) => Promise<{ status: () => number; headers: () => { "set-cookie"?: string } }> }): Promise<Record<string, string>> {
  const testCode = "test_job_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  const loginRes = await request.get(`${API_BASE}/auth/wechat/login?code=${testCode}`);
  expect(loginRes.status()).toBe(200);
  const cookies = loginRes.headers()["set-cookie"];
  const headers: Record<string, string> = {};
  if (cookies) headers["Cookie"] = cookies;
  return headers;
}

test.describe("API - 职位相关接口", () => {
  test("GET /jobs 未登录返回 401", async ({ request }) => {
    const response = await request.get(`${API_BASE}/jobs`);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toContain("请先登录");
  });

  test("GET /jobs 登录后返回职位列表", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/jobs`, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("content");
    expect(body).toHaveProperty("totalElements");
    expect(body).toHaveProperty("number");
    expect(body).toHaveProperty("size");
    expect(Array.isArray(body.content)).toBe(true);
  });

  test("GET /jobs 支持分页参数", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/jobs?page=0&size=5`, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.size).toBe(5);
  });

  test("GET /jobs 支持行业筛选", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/jobs?industry=互联网`, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.content)).toBe(true);
  });

  test("GET /jobs 支持类型筛选", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/jobs?type=秋招`, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.content)).toBe(true);
  });

  test("GET /jobs 支持地点筛选", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/jobs?location=北京`, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.content)).toBe(true);
  });

  test("GET /jobs 支持截止日期筛选", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/jobs?deadlineDays=7`, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.content)).toBe(true);
  });

  test("GET /jobs 支持今日新增筛选", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/jobs?onlyNewToday=true`, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.content)).toBe(true);
  });
});

test.describe("API - 职位状态更新", () => {
  test("PUT /jobs/{jobId}/status 未登录返回 401", async ({ request }) => {
    const response = await request.put(`${API_BASE}/jobs/1/status`, {
      headers: { "Content-Type": "application/json" },
      data: { status: "已投递" },
    });
    expect(response.status()).toBe(401);
  });

  test("PUT /jobs/{jobId}/status 更新不存在职位返回 400", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    headers["Content-Type"] = "application/json";
    const response = await request.put(`${API_BASE}/jobs/99999/status`, {
      headers,
      data: { status: "已投递" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toContain("不存在");
  });

  test("PUT /jobs/{jobId}/status 无效状态返回 400", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    headers["Content-Type"] = "application/json";
    const response = await request.put(`${API_BASE}/jobs/1/status`, {
      headers,
      data: { status: "无效状态" },
    });
    expect(response.status()).toBe(400);
  });
});
