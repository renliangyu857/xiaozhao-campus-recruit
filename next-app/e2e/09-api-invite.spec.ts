import { test, expect } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3000/api';

async function loginAndGetHeaders(request: any): Promise<Record<string, string>> {
  const testCode = 'test_invite_' + Date.now() + '_' + Math.random().toString(36).substring(7);
  const loginRes = await request.get(`${API_BASE}/auth/wechat/login?code=${testCode}`);
  expect(loginRes.status()).toBe(200);

  const cookies = loginRes.headers()['set-cookie'];
  const headers: Record<string, string> = {};
  if (cookies) {
    headers['Cookie'] = cookies;
  }
  return headers;
}

test.describe('API - 邀请码生成', () => {
  test('POST /invite/generate 未登录返回 401', async ({ request }) => {
    const response = await request.post(`${API_BASE}/invite/generate`);
    expect(response.status()).toBe(401);
  });

  test('POST /invite/generate 登录后生成邀请码', async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.post(`${API_BASE}/invite/generate`, { headers });
    expect([200, 400]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.inviteCode !== undefined || body.code !== undefined).toBe(true);
    }
  });
});

test.describe('API - 邀请统计', () => {
  test('GET /invite/stats 未登录返回 401', async ({ request }) => {
    const response = await request.get(`${API_BASE}/invite/stats`);
    expect(response.status()).toBe(401);
  });

  test('GET /invite/stats 登录后返回统计', async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    const response = await request.get(`${API_BASE}/invite/stats`, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('inviteCode');
    expect(body).toHaveProperty('count');
  });
});

test.describe('API - 绑定邀请码', () => {
  test('POST /invite/bind 未登录返回 401', async ({ request }) => {
    const response = await request.post(`${API_BASE}/invite/bind`, {
      headers: { 'Content-Type': 'application/json' },
      data: { inviteCode: 'TEST123' }
    });
    expect(response.status()).toBe(401);
  });

  test('POST /invite/bind 无效邀请码返回 400', async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    headers['Content-Type'] = 'application/json';
    const response = await request.post(`${API_BASE}/invite/bind`, {
      headers,
      data: { inviteCode: 'INVALID_CODE_12345' }
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('邀请码无效');
  });

  test('POST /invite/bind 已使用的邀请码返回 400', async ({ request }) => {
    const headers = await loginAndGetHeaders(request);
    headers['Content-Type'] = 'application/json';
    const response = await request.post(`${API_BASE}/invite/bind`, {
      headers,
      data: { inviteCode: 'ALREADY_USED' }
    });
    expect(response.status()).toBe(400);
  });
});
