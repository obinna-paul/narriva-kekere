export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        slug: true,
        avatar: true,
        bio: true,
        suspended: true,
        suspensionReason: true,
        suspendedUntil: true,
        createdAt: true,
        termsAcceptedAt: true,
        deletionRequestedAt: true,
        referralCode: true,
        wallet: {
          select: { spendingBalance: true, earnedBalance: true },
        },
        _count: {
          select: { stories: true, unlocks: true, bookPurchases: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const recentActions = await prisma.adminAction.findMany({
      where: { targetUserId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const adminIds = Array.from(new Set(recentActions.map((a) => a.adminId)));
    const admins = await prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, name: true },
    });
    const adminMap = new Map(admins.map((a) => [a.id, a.name]));

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      slug: user.slug,
      avatar: user.avatar,
      bio: user.bio,
      suspended: user.suspended,
      suspensionReason: user.suspensionReason,
      suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      termsAcceptedAt: user.termsAcceptedAt?.toISOString() ?? null,
      deletionRequestedAt: user.deletionRequestedAt?.toISOString() ?? null,
      referralCode: user.referralCode,
      cowrieBalances: {
        spendingBalance: user.wallet?.spendingBalance ?? 0,
        earnedBalance: user.wallet?.earnedBalance ?? 0,
      },
      stats: {
        storyCount: user._count.stories,
        unlockCount: user._count.unlocks,
        bookPurchaseCount: user._count.bookPurchases,
      },
      actionLog: recentActions.map((a) => ({
        id: a.id,
        adminId: a.adminId,
        adminName: adminMap.get(a.adminId) ?? a.adminId,
        action: a.action,
        detail: a.detail,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  },
  { roles: ["ADMIN"] },
);
