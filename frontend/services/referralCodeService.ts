import { apiFetch } from './apiClient';

export interface ReferralCodeItem {
  id: number;
  companyName: string;
  code: string;
  usageCount: number;
  isValid: boolean;
  createdAt?: string;
}

export interface ReferralCodesPage {
  content: ReferralCodeItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export function getReferralCodes(page = 0, size = 20, companyName?: string): Promise<ReferralCodesPage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (companyName?.trim()) params.set('companyName', companyName.trim());
  return apiFetch<ReferralCodesPage>(`/referral-codes?${params}`);
}

export function useReferralCode(id: number): Promise<ReferralCodeItem> {
  return apiFetch<ReferralCodeItem>(`/referral-codes/${id}/use`, { method: 'POST' });
}
