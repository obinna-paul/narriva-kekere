export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { isValidTiptapDoc, ensureParagraphIds, countWords, type TiptapDoc } from "@/lib/tiptap/doc-utils";

const WORDS_PER_MINUTE = 200;

/**
 * The admin editorial working copy for a story under review. Distinct from the
 * All-Stories editor (/edit), which overwrites the live `body` immediately:
 * here an edit never touches the story's live `body`/`hookLine` — it
 * accumulates in the edited* columns, so the writer's original submission
 * stays intact until the edits are promoted at publish time. The autosave
 * contract (payload shape + the { story: { lastSavedAt } } response) matches
 * the writer route exactly, so the shared StoryEditor component can point at
 * this endpoint unchanged.
 */

export const GET = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };

    const story = await prisma.story.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        hookLine: true,
        body: true,
        wordCount: true,
        editedHookLine: true,
        editedBody: true,
        editedWordCount: true,
        editLastSavedAt: true,
      },
    });

    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    const hasEdits = story.editedBody !== null || story.editedHookLine !== null;

    return NextResponse.json({
      id: story.id,
      title: story.title,
      // The writer's untouched original — the reference for the diff a later
      // phase shows the writer, and the "Revert" target.
      originalHookLine: story.hookLine,
      originalBody: story.body,
      originalWordCount: story.wordCount ?? 0,
      // The working copy, or null when the admin hasn't edited yet. The editor
      // starts from editedBody ?? body.
      editedHookLine: story.editedHookLine,
      editedBody: story.editedBody,
      editedWordCount: story.editedWordCount,
      editLastSavedAt: story.editLastSavedAt?.toISOString() ?? null,
      hasEdits,
    });
  },
  { roles: ["ADMIN"] },
);

const editSchema = z.object({
  // Sent by StoryEditor's body-save channel.
  body: z
    .any()
    .refine((v) => v === undefined || isValidTiptapDoc(v), "body must be a valid Tiptap document")
    .optional(),
  wordCount: z.number().int().min(0).optional(),
  // Sent by the review queue's separate hook-line autosave.
  hookLine: z.string().max(300).optional(),
  // The editLastSavedAt the client last saw — lets a stale save (another admin,
  // another tab) be detected instead of silently overwriting newer edits.
  // Only enforced on body saves, which are the ones that move the watermark.
  expectedLastSavedAt: z.string().datetime().nullable().optional(),
});

export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { id } = params as { id: string };

    let raw: unknown;
    try { raw = await request.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

    const parsed = editSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { body: rawBody, hookLine, expectedLastSavedAt } = parsed.data;

    const current = await prisma.story.findUnique({
      where: { id },
      select: { editLastSavedAt: true },
    });
    if (!current) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    const data: Prisma.StoryUpdateInput = {};

    if (rawBody) {
      const currentIso = current.editLastSavedAt ? current.editLastSavedAt.toISOString() : null;
      if (expectedLastSavedAt !== undefined && expectedLastSavedAt !== currentIso) {
        return NextResponse.json(
          { error: "conflict", message: "These edits were saved from another device — your changes were not applied." },
          { status: 409 },
        );
      }
      // Never store a paragraph without an id — the editorial inline comments
      // (a later phase) anchor to paragraph ids, same as the reader layer.
      const doc = ensureParagraphIds(rawBody as TiptapDoc);
      const wordCount = countWords(doc);
      data.editedBody = doc as unknown as Prisma.InputJsonValue;
      data.editedWordCount = wordCount;
      data.editedReadingTime = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
      data.editLastSavedAt = new Date();
    }

    if (hookLine !== undefined) {
      data.editedHookLine = hookLine;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
    }

    const updated = await prisma.story.update({
      where: { id },
      data,
      select: { editLastSavedAt: true },
    });

    // Same response shape StoryEditor expects from the writer route.
    return NextResponse.json({
      story: { lastSavedAt: updated.editLastSavedAt?.toISOString() ?? null },
    });
  },
  { roles: ["ADMIN"] },
);

/** Discards the working copy and restores the writer's original submission
 * as the thing the reviewer sees. */
export const DELETE = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };
    await prisma.story.update({
      where: { id },
      data: {
        editedBody: Prisma.DbNull,
        editedHookLine: null,
        editedWordCount: null,
        editedReadingTime: null,
        editLastSavedAt: null,
      },
    });
    return NextResponse.json({ ok: true });
  },
  { roles: ["ADMIN"] },
);
