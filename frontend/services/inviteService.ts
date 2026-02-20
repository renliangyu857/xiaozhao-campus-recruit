import { apiFetch } from './apiClient';

export interface InviteGenerateResult {
  inviteCode: string;
  link: string;
}

export interface InviteStats {
  totalInvited: number;
  rewards: string[];
  inviteCode: string;
}

export function generateInvite(): Promise<InviteGenerateResult> {
  return apiFetch<InviteGenerateResult>('/invite/generate', { method: 'POST' });
}

export function getInviteStats(): Promise<InviteStats> {
  return apiFetch<InviteStats>('/invite/stats');
}

export function bindInviteCode(inviteCode: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/invite/bind', {
    method: 'POST',
    json: { inviteCode },
  });
}
