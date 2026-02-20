import { ApplyStatus, FilterState, Job } from '../types';
import { apiFetch } from './apiClient';

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
}

export async function fetchJobsPage(
  filters: FilterState,
  onlyNewToday: boolean,
  page: number = 0,
  size: number = 30
): Promise<PageResult<Job>> {
  const params = new URLSearchParams();
  if (filters.industry !== 'ALL') params.set('industry', filters.industry);
  if (filters.type !== 'ALL') params.set('type', filters.type);
  if (filters.location) params.set('location', filters.location);
  if (filters.deadlineDays !== 'ALL') params.set('deadlineDays', filters.deadlineDays);
  if (filters.roles) params.set('roles', filters.roles);
  if (onlyNewToday) params.set('onlyNewToday', 'true');
  params.set('page', String(Math.max(0, page)));
  params.set('size', String(size));

  return await apiFetch<PageResult<Job>>(`/jobs?${params.toString()}`);
}

// Backward-compatible helper: returns current page content only.
export async function fetchJobs(filters: FilterState, onlyNewToday: boolean): Promise<Job[]> {
  const result = await fetchJobsPage(filters, onlyNewToday, 0, 30);
  return result.content || [];
}

export async function updateJobStatus(jobId: string, status: ApplyStatus): Promise<void> {
  await apiFetch(`/jobs/${encodeURIComponent(jobId)}/status`, {
    method: 'PUT',
    json: { status },
  });
}