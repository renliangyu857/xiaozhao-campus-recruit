import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function POST() {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }
  const inviteCode = `INV${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  await prisma.userInvitation.create({
    data: { inviterId: userId, inviteCode },
  });
  return NextResponse.json({ inviteCode });
}
