import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { verifyStoryAccess } from "@/lib/data/kekere-comments";
import { getStoryAudioUrl } from "@/lib/storage/r2";
import { docToPlainText, type TiptapDoc } from "@/lib/tiptap/doc-utils";

const WORDS_PER_MINUTE = 130;

export const GET = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    const hasAccess = await verifyStoryAccess(session.user.id, params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "story_locked" }, { status: 403 });
    }

    const story = await prisma.story.findUnique({
      where: { id: params.id },
      select: {
        title: true,
        body: true,
        wordCount: true,
        audioRef: true,
        audioGenerationStatus: true,
        audioDurationSecs: true,
      },
    });
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.audioGenerationStatus === "GENERATED" && story.audioRef) {
      const url = await getStoryAudioUrl(story.audioRef);
      return NextResponse.json({
        type: "remote",
        url,
        durationSecs: story.audioDurationSecs,
      });
    }

    const text = docToPlainText(story.body as unknown as TiptapDoc);
    const estimatedDuration = Math.round((story.wordCount / WORDS_PER_MINUTE) * 60);

    return NextResponse.json({
      type: "browser_tts",
      text,
      durationSecs: estimatedDuration,
    });
  }
);
