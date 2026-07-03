export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { generateStoryAudio } from "@/lib/audio/generate";

export const POST = withAuth(
  async (_request, _session, { params }: { params: { id: string } }) => {
    // Fire-and-forget, same as the automatic publish-time trigger — the
    // client polls GET /api/kekere/stories/[id] for audioGenerationStatus.
    generateStoryAudio(params.id).catch(console.error);
    return NextResponse.json({ success: true, status: "generating" });
  },
  { roles: ["ADMIN"] }
);
