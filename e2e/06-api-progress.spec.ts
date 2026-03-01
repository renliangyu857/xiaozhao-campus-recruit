import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE || "http://localhost:3000/api";

async function loginAndGetHeaders(request: import("@playwright/test").APIRequestContext): Promise<Record<string, string>> {
  const testCode = "test_progress_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  const loginRes = await request.get(`${API_BASE}/auth/wechat/login?code=${testCode}`);
  expect(loginRes.status()).toBe(200);
  const setCookie = loginRes.headers()["set-cookie"];
  const parts = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const cookieHeader = parts.map((p: string) => p.split(";")[0].trim()).filter(Boolean).join("; ");
  const headers: Record<string, string> = {};
  if (cookieHeader) headers["Cookie"] = cookieHeader;
  return headers;
}

test.describe("API - 进度统计接口", () => {
  test("GET /progress/stats 未登录也返回统计", async ({ request }) => {
    const response = await request.get(`${API_BASE}/progress/stats`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("totalApplied");
    expect(body).toHaveProperty("byStatus");
  });

  test("GET /progress/stats 登录后返回用户统计", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/progress/stats`, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("totalApplied");
    expect(body).toHaveProperty("byStatus");
  });
});

test.describe("API - 进度列表接口", () => {
  test("GET /progress/list 未登录返回 401", async ({ request }) => {
    const response = await request.get(`${API_BASE}/progress/list`);
    expect(response.status()).toBe(401);
  });

  test("GET /progress/list 登录后返回进度列表", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/progress/list`, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

test.describe("API - 进度笔记更新", () => {
  test("PUT /progress/{jobId}/note 未登录返回 401", async ({ request }) => {
    const response = await request.put(`${API_BASE}/progress/1/note`, {
      headers: { "Content-Type": "application/json" },
      data: { note: "测试笔记" },
    });
    expect(response.status()).toBe(401);
  });

  test("PUT /progress/{jobId}/note 登录后更新笔记", async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    headers["Content-Type"] = "application/json";
    const response = await request.put(`${API_BASE}/progress/1/note`, {
      headers,
      data: { note: "测试笔记内容" },
    });
    expect([200, 400]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.message).toBe("已更新");
    }
  });
});
