const API_BASE = typeof window !== "undefined" ? "/api" : process.env.NEXT_PUBLIC_API_BASE ?? "/api";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super((body as { message?: string })?.message ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  let body: BodyInit | undefined = init?.body ?? undefined;
  if (init && "json" in init && init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  const resp = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body,
    credentials: "include",
  });
  const contentType = resp.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await resp.json().catch(() => null) : await resp.text().catch(() => null);
  if (!resp.ok) {
    throw new ApiError(resp.status, data);
  }
  return data as T;
}
