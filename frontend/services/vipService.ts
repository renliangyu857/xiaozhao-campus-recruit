import { apiFetch } from './apiClient';
import { VipPlan } from '../types';

export function getVipPlans(): Promise<VipPlan[]> {
  return apiFetch<VipPlan[]>('/vip/plans');
}

export interface CreateOrderResponse {
  orderNo: string;
  wechatJsapiParams?: Record<string, string>;
}

export function createVipOrder(planId: string): Promise<CreateOrderResponse> {
  return apiFetch<CreateOrderResponse>('/vip/create-order', { method: 'POST', json: { planId } });
}

