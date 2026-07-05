export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { createStory } from "@/lib/data/kekere-stories";
import {
  CompetitionEntryError,
  CompetitionNotFoundError,
  submitStoryToCompetition,
} from "@/lib/data/kekere-competitions";
import { docxBufferToDoc, DocxImportError, DOCX_MIME_TYPE } from "@/lib/tiptap/docx-import";
import { countWords } from "@/lib/tiptap/doc-utils";
import { READING_WPM } from "@/content/decisions";

const TITLE_LIMIT = 200;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — plenty for a flash-fiction-length .docx

/**
 * Second way to enter a competition (alongside POST .../submit with an
 * existing storyId): upload a .docx directly. Creates a brand-new Story from
 * the document's text, then enters it exactly like any other submission —
 * so it shows up identically in the admin entries list either way.
 */
export const POST = withAuth(
  async (request, session, { params }: { params: { id: string } }) => {
    const formData = await request.formData();
    const file = formData.get("file");
    const title = formData.get("title");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (title.length > TITLE_LIMIT) {
      return NextResponse.json({ error: `Title must be ${TITLE_LIMIT} characters or fewer` }, { status: 400 });
    }

    const isDocx = file.name.toLowerCase().endsWith(".docx") || file.type === DOCX_MIME_TYPE;
    if (!isDocx) {
      return NextResponse.json(
        { error: "Only Word documents (.docx) are accepted — no PDFs." },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File is too large (8MB max)." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let doc;
    try {
      doc = await docxBufferToDoc(buffer);
    } catch (error) {
      if (error instanceof DocxImportError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    const wordCount = countWords(doc);
    const readingTime = Math.max(1, Math.round(wordCount / READING_WPM));

    const story = await createStory(session.user.id, {
      title: title.trim(),
      hookLine: " ",
      body: doc,
      wordCount,
      readingTime,
    });

    try {
      const entry = await submitStoryToCompetition(params.id, session.user.id, story.id);
      return NextResponse.json({ entry, story }, { status: 201 });
    } catch (error) {
      if (error instanceof CompetitionNotFoundError) {
        return NextResponse.json({ error: "Competition not found" }, { status: 404 });
      }
      if (error instanceof CompetitionEntryError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }
  }
);
