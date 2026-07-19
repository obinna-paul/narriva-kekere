export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getStoryById } from "@/lib/data/kekere-stories";
import { wordBufferToHtml, DocxImportError, DOCX_MIME_TYPE, DOC_MIME_TYPE } from "@/lib/tiptap/word-import";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — matches the competition-entry upload limit

// Editable the same window a story can be worked on at all — mirrors
// updateStory()'s own gate in kekere-stories.ts. Checked here too (even
// though this route doesn't persist anything itself) so a writer isn't
// surprised by a doc that parsed fine but then can't actually be saved.
const EDITABLE_STATUSES = ["DRAFT", "REVISIONS_REQUESTED"];

/**
 * Extracts a Word document into HTML (bold/italic/underline/strikethrough
 * preserved where the source format allows it) so the client can convert it
 * to Tiptap JSON with generateJSON() against the exact same schema the live
 * editor uses, then load it in with setContent(). No DB write happens here —
 * the client is responsible for calling the story's normal save/flush path
 * once the writer is happy with what landed in the editor.
 */
export const POST = withAuth(async (request, session, { params }: { params: { id: string } }) => {
  const story = await getStoryById(params.id);
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  if (story.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!EDITABLE_STATUSES.includes(story.status)) {
    return NextResponse.json(
      { error: "This story can't be edited right now, so a document can't be imported into it." },
      { status: 409 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const isDocx = name.endsWith(".docx") || file.type === DOCX_MIME_TYPE;
  const isLegacyDoc = !isDocx && (name.endsWith(".doc") || file.type === DOC_MIME_TYPE);
  if (!isDocx && !isLegacyDoc) {
    return NextResponse.json(
      { error: "Only Word documents (.doc or .docx) are accepted — no PDFs." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (8MB max)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const html = await wordBufferToHtml(buffer, isLegacyDoc);
    return NextResponse.json({ html });
  } catch (error) {
    if (error instanceof DocxImportError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
});
