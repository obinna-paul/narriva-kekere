export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const PUT = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    const notification = await prisma.notification.findUnique({ where: { id: params.id } });
    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    await prisma.notification.update({ where: { id: params.id }, data: { read: true } });
    return NextResponse.json({ success: true });
  }
);
