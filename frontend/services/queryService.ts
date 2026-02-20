import { apiFetch } from './apiClient';

export interface QueryConsumeResult {
  allowed: boolean;
  remainingFreeQueries?: number | null;
}

export function consumeQuery(): Promise<QueryConsumeResult> {
  return apiFetch<QueryConsumeResult>('/query/consume', { method: 'POST' });
}

