import type { Job, FilterState } from "./types";
import type { ApplyStatus } from "./types";
import { apiFetch } from "./apiClient";

export interface PageResult<T> {
  content: T[];
  totalElements: number | null;
  totalPages?: number | null;
  number: number;
  size: number;
  hasNext?: boolean;
}

export async function fetchJobsPage(
  filters: FilterState,
  onlyNewToday: boolean,
  page = 0,
  size = 30
): Promise<PageResult<Job>> {
  const params = new URLSearchParams();
  if (filters.industry !== "ALL") params.set("industry", filters.industry);
  if (filters.type !== "ALL") params.set("type", filters.type);
  if (filters.location) params.set("location", filters.location);
  if (filters.deadlineDays !== "ALL") params.set("deadlineDays", filters.deadlineDays);
  if (filters.roles) params.set("roles", filters.roles);
  if (onlyNewToday) params.set("onlyNewToday", "true");
  params.set("page", String(Math.max(0, page)));
  params.set("size", String(size));
  if (page === 0) params.set("includeTotal", "true");
  return apiFetch<PageResult<Job>>(`/jobs?${params.toString()}`);
}

export async function updateJobStatus(jobId: string, status: ApplyStatus): Promise<void> {
  await apiFetch(`/jobs/${encodeURIComponent(jobId)}/status`, {
    method: "PUT",
    json: { status },
  });
}
