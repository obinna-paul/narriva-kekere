export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/logAction";

export const POST = withAuth(
  async (_request, session, { params }) => {
    const { id } = params as { id: string };

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, suspended: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!target.suspended) {
      return NextResponse.json({ error: "User is not suspended." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id },
      data: {
        suspended: false,
        suspensionReason: null,
        suspendedUntil: null,
      },
    });

    await logAdminAction(session.user.id, id, "UNSUSPEND", {});

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] },
);
