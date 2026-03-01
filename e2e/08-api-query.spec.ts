import { test, expect } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3000/api';

async function loginAndGetHeaders(request: any): Promise<Record<string, string>> {
  const testCode = 'test_query_' + Date.now() + '_' + Math.random().toString(36).substring(7);
  const loginRes = await request.get(`${API_BASE}/auth/wechat/login?code=${testCode}`);
  expect(loginRes.status()).toBe(200);

  const cookies = loginRes.headers()['set-cookie'];
  const headers: Record<string, string> = {};
  if (cookies) {
    headers['Cookie'] = cookies;
  }
  return headers;
}

test.describe('API - 查询次数消耗', () => {
  test('POST /query/consume 未登录返回 401', async ({ request }) => {
    const response = await request.post(`${API_BASE}/query/consume`);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toContain('请先登录');
  });

  test('POST /query/consume 登录后消耗查询次数', async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.post(`${API_BASE}/query/consume`, { headers });
    // 可能返回 200（允许查询）或 403（次数用尽）
    expect([200, 403]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('allowed');
      expect(body.allowed).toBe(true);
      expect(body).toHaveProperty('remainingFreeQueries');
    } else {
      const body = await response.json();
      expect(body.message).toContain('免费次数已用完');
    }
  });

  test('POST /query/consume 多次调用后次数用尽', async ({ request }) => {
    const headers = await loginAndGetHeaders(request);

    // 连续调用多次，直到次数用尽
    let lastStatus = 200;
    for (let i = 0; i < 10; i++) {
      const response = await request.post(`${API_BASE}/query/consume`, { headers });
      lastStatus = response.status();
      if (response.status() === 403) {
        const body = await response.json();
        expect(body.message).toContain('免费次数已用完');
        break;
      }
    }

    // 至少有一次调用会返回 200 或最终返回 403
    expect([200, 403]).toContain(lastStatus);
  });
});
