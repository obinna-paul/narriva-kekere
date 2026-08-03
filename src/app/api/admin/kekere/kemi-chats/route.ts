export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { listKemiConversationsForAdmin } from "@/lib/data/kekere-kemi-chats";

export const GET = withAuth(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
    const search = searchParams.get("search")?.trim() || undefined;

    const result = await listKemiConversationsForAdmin({ page, limit, search });

    return NextResponse.json({
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
      conversations: result.conversations.map((c) => ({
        id: c.id,
        sessionId: c.sessionId,
        userId: c.userId,
        userName: c.userName,
        userEmail: c.userEmail,
        messageCount: c.messageCount,
        lastMessagePreview: c.lastMessagePreview,
        startedAt: c.startedAt.toISOString(),
        lastMessageAt: c.lastMessageAt.toISOString(),
      })),
    });
  },
  { roles: ["ADMIN"] },
);
