export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { listNotesForAdmin } from "@/lib/data/kekere-notes";

export const GET = withAuth(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
    const reportedOnly = searchParams.get("reportedOnly") === "true";
    const search = searchParams.get("search")?.trim() || undefined;

    const result = await listNotesForAdmin({ page, limit, reportedOnly, search });

    return NextResponse.json({
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
      notes: result.notes.map((n) => ({
        id: n.id,
        storyId: n.storyId,
        storyTitle: n.storyTitle,
        fromUserId: n.fromUserId,
        fromUserName: n.fromUserName,
        fromUserEmail: n.fromUserEmail,
        toWriterId: n.toWriterId,
        toWriterName: n.toWriterName,
        toWriterEmail: n.toWriterEmail,
        body: n.body,
        replyBody: n.replyBody,
        repliedAt: n.repliedAt?.toISOString() ?? null,
        reported: n.reported,
        reportedAt: n.reportedAt?.toISOString() ?? null,
        pinnedAt: n.pinnedAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  },
  { roles: ["ADMIN"] },
);
