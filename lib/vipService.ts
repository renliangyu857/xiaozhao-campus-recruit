import { apiFetch } from "./apiClient";
import { clearUserCache } from "./authService";
import type { VipPlan, VipDashboard } from "./types";

export function getVipPlans(): Promise<VipPlan[]> {
  return apiFetch<VipPlan[]>("/vip/plans");
}

export function getVipDashboard(): Promise<VipDashboard> {
  return apiFetch<VipDashboard>("/vip/dashboard");
}

export interface CreateOrderResponse {
  orderId?: string;
  orderNo?: string;
  message?: string;
  refreshUser?: boolean;
  newVipExpiry?: string;
  startAt?: string;
  endAt?: string;
}

export async function createVipOrder(planId: string): Promise<CreateOrderResponse> {
  const result = await apiFetch<CreateOrderResponse>("/vip/create-order", { method: "POST", json: { planId } });

  // 购买成功后清除用户缓存，确保获取最新VIP状态
  if (result.refreshUser || result.orderId) {
    clearUserCache();
    console.log("[VIP] User cache cleared after purchase");
  }

  return result;
}
