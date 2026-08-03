export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/logAction";

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
        earnedBalance: user.wallet?.earnedBalance.toNumber() ?? 0,
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

const deleteSchema = z.object({
  // Required to delete an account that has real money owed (earned cowries)
  // or published stories other readers have unlocked — guards against
  // wiping either by accident. See the 409 branch below.
  force: z.boolean().optional(),
});

export const DELETE = withAuth(
  async (request, session, { params }) => {
    const { id } = params as { id: string };

    if (id === session.user.id) {
      return NextResponse.json({ error: "Cannot delete your own account." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        wallet: { select: { earnedBalance: true } },
      },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // A blanket block, not force-bypassable — deleting an admin account this
    // way is never the right tool. Demote them to reader/writer first if the
    // account genuinely needs to go.
    if (target.role === "ADMIN") {
      return NextResponse.json(
        { error: "is_admin", message: "Admin accounts can't be deleted here. Change their role first if you're sure." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = deleteSchema.safeParse(body ?? {});
    const force = parsed.success ? (parsed.data.force ?? false) : false;

    const earnedBalance = target.wallet?.earnedBalance?.toNumber() ?? 0;
    const publishedCount = await prisma.story.count({ where: { authorId: id, status: "PUBLISHED" } });

    if (!force && (earnedBalance > 0 || publishedCount > 0)) {
      const reasons: string[] = [];
      if (earnedBalance > 0) {
        reasons.push(`${earnedBalance} earned cowrie${earnedBalance === 1 ? "" : "s"} (real money owed)`);
      }
      if (publishedCount > 0) {
        reasons.push(
          `${publishedCount} published stor${publishedCount === 1 ? "y" : "ies"} — deleting also deletes ` +
            "those stories and every reader's unlock/read history for them",
        );
      }
      return NextResponse.json(
        {
          error: "needs_force",
          message: `${target.name} has ${reasons.join(" and ")}. Confirm to delete anyway.`,
          earnedBalance,
          publishedCount,
        },
        { status: 409 },
      );
    }

    // Logged before the delete, with a snapshot of what's being removed —
    // the row (and everything cascading from it) won't exist to look up
    // afterward.
    await logAdminAction(session.user.id, id, "DELETE_USER", {
      name: target.name,
      email: target.email,
      role: target.role,
      earnedBalance,
      publishedCount,
    });

    // Every relation on User cascades on delete (wallet, stories, follows,
    // notes, contracts, etc. — and everything that in turn hangs off a
    // deleted story), so this removes the account and all of its data in one
    // operation. See the equivalent comment on the onboarding-only
    // delete-writer route for the full relation list.
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Deleted ${target.name} and all of their data.`,
    });
  },
  { roles: ["ADMIN"] },
);
