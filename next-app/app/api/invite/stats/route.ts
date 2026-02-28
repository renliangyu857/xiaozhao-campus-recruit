import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

// 生成6位大写字母+数字的邀请码
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 生成唯一邀请码
async function generateUniqueInviteCode(): Promise<string> {
  let code = generateInviteCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // 检查是否已存在
    const existing = await prisma.userInvitation.findFirst({
      where: { inviteCode: code },
    });
    if (!existing) {
      return code;
    }
    // 已存在则重新生成
    code = generateInviteCode();
    attempts++;
  }

  // 如果尝试多次仍有冲突，添加时间戳后缀
  return `${code}${Date.now().toString(36).toUpperCase().slice(-2)}`;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (userId == null) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }
  const invites = await prisma.userInvitation.findMany({
    where: { inviterId: userId },
    select: { inviteCode: true, inviteeId: true },
  });
  const totalInvited = invites.filter((i) => i.inviteeId != null).length;
  const latest = invites[invites.length - 1];
  // 如果没有邀请码，生成一个新的
  let inviteCode = latest?.inviteCode;
  if (!inviteCode) {
    inviteCode = await generateUniqueInviteCode();
    await prisma.userInvitation.create({
      data: {
        inviterId: userId,
        inviteCode,
      },
    });
  }
  return NextResponse.json({
    inviteCode,
    totalInvited,
  });
}
