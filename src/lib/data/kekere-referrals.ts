import { prisma } from "@/lib/db/prisma";

export function generateReferralCode(name: string): string {
  const base = name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .join("")
    .slice(0, 4)
    .padEnd(4, "X");
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}-${suffix}`;
}

export async function creditReferrer(invitedUserId: string) {
  const invited = await prisma.user.findUnique({
    where: { id: invitedUserId },
    select: { referredBy: true },
  });
  if (!invited?.referredBy) return;

  const inviter = await prisma.user.findUnique({
    where: { referralCode: invited.referredBy },
    select: { id: true, wallet: { select: { id: true } } },
  });
  if (!inviter?.wallet) return;

  const already = await prisma.transaction.findFirst({
    where: {
      walletId: inviter.wallet.id,
      type: "REFERRAL",
      description: invitedUserId,
    },
  });
  if (already) return;

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { userId: inviter.id },
      data: { balance: { increment: 1 } },
    });

    await tx.transaction.create({
      data: {
        walletId: inviter.wallet!.id,
        type: "REFERRAL",
        amountCowries: 1,
        status: "COMPLETED",
        description: invitedUserId,
      },
    });
  });
}

export async function creditReadReward(userId: string, storyId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return;

  const already = await prisma.transaction.findFirst({
    where: {
      walletId: wallet.id,
      type: "READ_REWARD",
      description: storyId,
    },
  });
  if (already) return;

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: 1 } },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "READ_REWARD",
        amountCowries: 1,
        status: "COMPLETED",
        description: storyId,
      },
    });
  });
}
