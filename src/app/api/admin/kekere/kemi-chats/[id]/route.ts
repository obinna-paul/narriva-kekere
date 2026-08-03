export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getKemiConversationForAdmin } from "@/lib/data/kekere-kemi-chats";

export const GET = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };

    const conversation = await getKemiConversationForAdmin(id);
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    return NextResponse.json({
      id: conversation.id,
      sessionId: conversation.sessionId,
      userId: conversation.userId,
      userName: conversation.userName,
      userEmail: conversation.userEmail,
      startedAt: conversation.startedAt.toISOString(),
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      messages: conversation.messages,
    });
  },
  { roles: ["ADMIN"] },
);
