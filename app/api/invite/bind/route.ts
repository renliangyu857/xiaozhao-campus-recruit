import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }
  let body: { inviteCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "邀请码无效或已使用" }, { status: 400 });
  }
  const inviteCode = body?.inviteCode?.trim();
  if (!inviteCode) {
    return NextResponse.json({ message: "邀请码无效或已使用" }, { status: 400 });
  }
  const inv = await prisma.userInvitation.findUnique({
    where: { inviteCode },
  });
  if (!inv || inv.inviteeId != null) {
    return NextResponse.json({ message: "邀请码无效或已使用" }, { status: 400 });
  }
  await prisma.userInvitation.update({
    where: { id: inv.id },
    data: { inviteeId: userId },
  });
  return NextResponse.json({ message: "绑定成功" });
}
