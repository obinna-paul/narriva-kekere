import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

const RECENT_LIMIT = 30;

export const GET = withAuth(async (_request, session) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: { id: true, type: true, title: true, body: true, link: true, read: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: session.user.id, read: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
});
