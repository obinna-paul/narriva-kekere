import { prisma } from "@/lib/db/prisma";

export async function tipWriter(tipperUserId: string, storyId: string) {
  return prisma.$transaction(async (tx) => {
    const story = await tx.story.findUnique({
      where: { id: storyId },
      select: { id: true, title: true, authorId: true },
    });
    if (!story) throw new Error("Story not found");

    const writerId = story.authorId;
    if (writerId === tipperUserId) throw new Error("Cannot tip yourself");

    const tipperWallet = await tx.wallet.findUnique({ where: { userId: tipperUserId } });
    if (!tipperWallet || tipperWallet.balance < 1) throw new Error("Not enough cowries");

    const writerWallet = await tx.wallet.upsert({
      where: { userId: writerId },
      create: { userId: writerId, balance: 1 },
      update: {},
    });

    await tx.wallet.update({
      where: { userId: tipperUserId },
      data: { balance: { decrement: 1 } },
    });

    await tx.wallet.update({
      where: { userId: writerId },
      data: { balance: { increment: 1 } },
    });

    await tx.transaction.create({
      data: {
        walletId: tipperWallet.id,
        type: "TIP",
        amountCowries: -1,
        status: "COMPLETED",
        description: `Tipped writer for "${story.title}"`,
      },
    });

    await tx.transaction.create({
      data: {
        walletId: writerWallet.id,
        type: "TIP",
        amountCowries: 1,
        status: "COMPLETED",
        description: `Tip from a reader for "${story.title}"`,
      },
    });

    return { balance: tipperWallet.balance - 1 };
  });
}
