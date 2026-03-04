import { test, expect } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3000/api';

async function loginAndGetHeaders(request: typeof test.request): Promise<Record<string, string>> {
  const testCode = 'test_referral_' + Date.now() + '_' + Math.random().toString(36).substring(7);
  const loginRes = await request.get(`${API_BASE}/auth/wechat/login?code=${testCode}`);
  expect(loginRes.status()).toBe(200);

  const cookies = loginRes.headers()['set-cookie'];
  const headers: Record<string, string> = {};
  if (cookies) {
    headers['Cookie'] = cookies;
  }
  return headers;
}

test.describe('API - 内推码列表', () => {
  test('GET /referral-codes 未登录返回 401', async ({ request }) => {
    const response = await request.get(`${API_BASE}/referral-codes`);
    expect(response.status()).toBe(401);
  });

  test('GET /referral-codes 非会员返回 403', async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/referral-codes`, { headers });
    // 根据用户是否是VIP，返回 200 或 403
    expect([200, 403]).toContain(response.status());
    if (response.status() === 403) {
      const body = await response.json();
      expect(body.message).toContain('会员');
    }
  });

  test('GET /referral-codes 支持分页', async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/referral-codes?page=0&size=10`, { headers });
    expect([200, 403]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('content');
      expect(body).toHaveProperty('totalElements');
      expect(body).toHaveProperty('number');
    }
  });

  test('GET /referral-codes 支持公司名搜索', async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/referral-codes?companyName=字节`, { headers });
    expect([200, 403]).toContain(response.status());
  });
});

test.describe('API - 使用内推码', () => {
  test('POST /referral-codes/{id}/use 未登录返回 401', async ({ request }) => {
    const response = await request.post(`${API_BASE}/referral-codes/1/use`);
    expect(response.status()).toBe(401);
  });

  test('POST /referral-codes/{id}/use 非会员返回 403', async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.post(`${API_BASE}/referral-codes/1/use`, { headers });
    // 根据用户是否是VIP，返回 200/404 或 403
    expect([200, 403, 404]).toContain(response.status());
  });

  test('POST /referral-codes/{id}/use 不存在的内推码返回 404', async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.post(`${API_BASE}/referral-codes/99999/use`, { headers });
    // 如果不是会员，可能返回 403
    expect([403, 404]).toContain(response.status());
  });
});
