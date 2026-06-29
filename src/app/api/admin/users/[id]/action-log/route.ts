import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const actions = await prisma.adminAction.findMany({
      where: { targetUserId: id },
      orderBy: { createdAt: "desc" },
    });

    const adminIds = Array.from(new Set(actions.map((a) => a.adminId)));
    const admins = await prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, name: true },
    });
    const adminMap = new Map(admins.map((a) => [a.id, a.name]));

    return NextResponse.json({
      actions: actions.map((a) => ({
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
