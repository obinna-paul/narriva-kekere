export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { updateBook } from "@/lib/data/books";
import { uploadEbookJson } from "@/lib/storage/r2";

// Matches the upload spec's input shape (chapters use `content`), distinct
// from the internal storage shape (EbookContent, which uses `body`) — admins
// upload the simple authoring format; we transform it once on the way in.
const uploadSchema = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  chapters: z
    .array(
      z.object({
        index: z.number().int().positive(),
        title: z.string().min(1),
        content: z.string().min(1),
      })
    )
    .min(1),
});

const WORDS_PER_MINUTE = 238;

export const POST = withAuth(
  async (request, _session, { params }: { params: { id: string } }) => {
    const body = await request.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid ebook JSON", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, chapters } = parsed.data;
    const sorted = [...chapters].sort((a, b) => a.index - b.index);
    const wordCount = sorted.reduce(
      (sum, c) => sum + c.content.split(/\s+/).filter(Boolean).length,
      0
    );

    const ebookRef = await uploadEbookJson(params.id, {
      title,
      chapterCount: sorted.length,
      chapters: sorted.map((c) => ({ index: c.index, title: c.title, body: c.content })),
    });

    const estimatedReadTime = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));

    const book = await updateBook(params.id, {
      ebookRef,
      chapterCount: sorted.length,
      wordCount,
      estimatedReadTime,
    });

    return NextResponse.json({
      ebookRef,
      chapterCount: book.chapterCount,
      wordCount: book.wordCount,
      estimatedReadTime: book.estimatedReadTime,
    });
  },
  { roles: ["ADMIN"] }
);
