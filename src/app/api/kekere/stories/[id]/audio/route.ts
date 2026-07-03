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
      try {
        const url = await getStoryAudioUrl(story.audioRef);
        return NextResponse.json({
          type: "remote",
          url,
          durationSecs: story.audioDurationSecs,
        });
      } catch {
        // R2 not configured or key missing — fall through to browser TTS
      }
    }

    // Body may be stored as a stringified JSON string on older rows
    let bodyDoc = story.body as unknown as TiptapDoc;
    if (typeof bodyDoc === "string") {
      try { bodyDoc = JSON.parse(bodyDoc as unknown as string); } catch { /* leave as-is */ }
    }
    const text = docToPlainText(bodyDoc).trim();
    if (!text) {
      return NextResponse.json(
        { error: "no_content", message: "This story has no audio content yet." },
        { status: 200 }
      );
    }
    const estimatedDuration = Math.round((story.wordCount / WORDS_PER_MINUTE) * 60);

    return NextResponse.json({
      type: "browser_tts",
      text,
      durationSecs: estimatedDuration,
    });
  }
);
