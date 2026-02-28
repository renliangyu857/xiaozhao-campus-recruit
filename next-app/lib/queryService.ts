import { apiFetch } from "./apiClient";

export async function consumeQuery(): Promise<{
  allowed: boolean;
  remainingFreeQueries?: number;
  queryCount?: number;
  maxFreeQueries?: number;
}> {
  return apiFetch("/query/consume", { method: "POST" });
}
