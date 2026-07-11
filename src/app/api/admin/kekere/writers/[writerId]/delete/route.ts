export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({
  // Required to delete a writer who has actually earned cowries — guards
  // against wiping a claimed writer who is owed real money by accident.
  force: z.boolean().optional(),
});

export const POST = withAuth(
  async (request, _session, { params }) => {
    const { writerId } = params as { writerId: string };

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body ?? {});
    const force = parsed.success ? parsed.data.force ?? false : false;

    const writer = await prisma.user.findUnique({
      where: { id: writerId },
      select: {
        id: true,
        name: true,
        role: true,
        createdByAdminId: true,
        wallet: { select: { earnedBalance: true } },
      },
    });

    if (!writer) {
      return NextResponse.json({ error: "Writer not found" }, { status: 404 });
    }

    // Only accounts an admin created through onboarding can be deleted here —
    // never a real, self-registered writer/reader. This is the real safety
    // rail, so this destructive tool can't be pointed at a genuine account.
    if (!writer.createdByAdminId) {
      return NextResponse.json(
        { error: "not_onboarded", message: "Only admin-onboarded accounts can be deleted here." },
        { status: 403 },
      );
    }

    if (writer.role === "ADMIN") {
      return NextResponse.json(
        { error: "is_admin", message: "Admin accounts can't be deleted here." },
        { status: 403 },
      );
    }

    const earned = writer.wallet?.earnedBalance?.toNumber() ?? 0;
    if (earned > 0 && !force) {
      return NextResponse.json(
        {
          error: "has_earnings",
          message: `${writer.name} has ${earned} earned cowrie${earned === 1 ? "" : "s"} (real money owed). Pass { "force": true } to delete anyway.`,
          earnedBalance: earned,
        },
        { status: 409 },
      );
    }

    // Every relation on User cascades on delete (wallet, stories, referral
    // code, contracts, notifications, etc.), so this removes the account and
    // all of its data in one go. Signed contracts are the exception — their
    // storyId is nulled when a story is deleted, but the contract row itself
    // belongs to the writer and cascades away with them here.
    await prisma.user.delete({ where: { id: writerId } });

    return NextResponse.json({
      success: true,
      message: `Deleted ${writer.name} and all of their data.`,
    });
  },
  { roles: ["ADMIN"] },
);
