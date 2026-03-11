import { signedFetch } from "./client-api-sign";

const API_BASE = typeof window !== "undefined" ? "/api" : process.env.NEXT_PUBLIC_API_BASE ?? "/api";

function buildApiUrl(path: string): string {
  const trimmedBase = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;

  if (!path) {
    return trimmedBase;
  }

  const normalizedPath = path.startsWith("/api/")
    ? path.slice(4)
    : path === "/api"
      ? ""
      : path;

  if (!normalizedPath) {
    return trimmedBase;
  }

  return normalizedPath.startsWith("/")
    ? `${trimmedBase}${normalizedPath}`
    : `${trimmedBase}/${normalizedPath}`;
}

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

  const url = buildApiUrl(path);

  // 客户端使用签名请求，服务端使用普通 fetch
  const resp = typeof window !== "undefined"
    ? await signedFetch(url, {
        ...init,
        headers,
        body,
        credentials: "include",
      })
    : await fetch(url, {
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
