export interface MemberRecord {
  planId: string;
  startAt: Date;
  endAt: Date;
}

export interface MemberEntitlement {
  isVip: boolean;
  isTrial: boolean;
  canDownloadMaterials: boolean;
  vipExpiry?: string;
}

export function selectActiveMember<T extends MemberRecord>(
  memberships: T[],
  now = new Date()
): T | null {
  return memberships
    .filter((membership) => membership.startAt <= now && membership.endAt >= now)
    .sort((a, b) => b.endAt.getTime() - a.endAt.getTime())[0] ?? null;
}

export function getMemberEntitlement(
  membership: MemberRecord | null | undefined,
  now = new Date()
): MemberEntitlement {
  if (!membership || membership.startAt > now || membership.endAt < now) {
    return {
      isVip: false,
      isTrial: false,
      canDownloadMaterials: false,
    };
  }

  const isTrial = membership.planId === "trial" || membership.planId === "gift";
  const isLifetime = membership.planId === "lifetime";

  return {
    isVip: true,
    isTrial,
    canDownloadMaterials: isLifetime,
    vipExpiry: membership.endAt.toISOString().slice(0, 10),
  };
}
