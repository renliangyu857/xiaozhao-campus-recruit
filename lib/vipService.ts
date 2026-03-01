import { apiFetch } from "./apiClient";
import type { VipPlan, VipDashboard } from "./types";

export function getVipPlans(): Promise<VipPlan[]> {
  return apiFetch<VipPlan[]>("/vip/plans");
}

export function getVipDashboard(): Promise<VipDashboard> {
  return apiFetch<VipDashboard>("/vip/dashboard");
}

export function createVipOrder(planId: string): Promise<{ orderId?: string; orderNo?: string; message?: string }> {
  return apiFetch("/vip/create-order", { method: "POST", json: { planId } });
}
