const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(body?.message || `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: any }
): Promise<T> {
  const headers = new Headers(init?.headers || {});
  let body: any = init?.body;
  if (init && 'json' in init) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify((init as any).json);
  }

  const resp = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body,
    credentials: 'include', // Spring Session Cookie
  });

  const contentType = resp.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await resp.json().catch(() => null) : await resp.text().catch(() => null);

  if (!resp.ok) {
    throw new ApiError(resp.status, data);
  }
  return data as T;
}

