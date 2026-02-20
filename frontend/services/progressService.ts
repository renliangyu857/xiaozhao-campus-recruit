import { apiFetch } from './apiClient';

export interface ProgressItem {
  jobId: string;
  company: string;
  status: string;
  updatedAt: string;
  locations: string[];
  applyLink: string;
  announcementLink: string;
  note?: string;
}

export async function fetchProgressList(): Promise<ProgressItem[]> {
  return await apiFetch<ProgressItem[]>('/progress/list');
}

export async function updateProgressNote(jobId: string, note: string): Promise<void> {
  await apiFetch(`/progress/${encodeURIComponent(jobId)}/note`, {
    method: 'PUT',
    json: { note },
  });
}
