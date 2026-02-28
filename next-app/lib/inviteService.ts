import { apiFetch } from "./apiClient";

export interface InviteStats {
  inviteCode: string;
  count?: number;
  totalInvited?: number;
  rewards?: string[];
}

export function generateInvite(): Promise<{ inviteCode: string }> {
  return apiFetch<{ inviteCode: string }>("/invite/generate", { method: "POST" });
}

export function getInviteStats(): Promise<InviteStats> {
  return apiFetch<InviteStats>("/invite/stats");
}

export function bindInviteCode(inviteCode: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/invite/bind", {
    method: "POST",
    json: { inviteCode },
  });
}
