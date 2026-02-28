import { apiFetch } from "./apiClient";

export interface ProgressItem {
  jobId: string;
  company: string;
  industry?: string;
  type?: string;
  status: string;
  note?: string;
}

export async function fetchProgressList(): Promise<ProgressItem[]> {
  return apiFetch<ProgressItem[]>("/progress/list");
}

export async function updateProgressNote(jobId: string, note: string): Promise<void> {
  await apiFetch(`/progress/${encodeURIComponent(jobId)}/note`, {
    method: "PUT",
    json: { note },
  });
}
