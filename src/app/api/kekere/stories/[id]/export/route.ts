export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getStoryById } from "@/lib/data/kekere-stories";
import { tiptapDocToDocxBuffer } from "@/lib/tiptap/docx-export";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";

/** A rejected story is locked from editing, but the writer still wrote it —
 * this is the only way they can get it back out of the app. Scoped to
 * REJECTED (rather than any story) since every other status either still
 * belongs to the writer in the editor or is already public. */
export const GET = withAuth(async (_request, session, { params }: { params: { id: string } }) => {
  const story = await getStoryById(params.id);
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  if (story.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (story.status !== "REJECTED") {
    return NextResponse.json({ error: "Only a rejected story can be exported." }, { status: 409 });
  }

  const buffer = await tiptapDocToDocxBuffer(story.body as unknown as TiptapDoc, story.title);
  const filename = `${story.title || "story"}.docx`.replace(/[^A-Za-z0-9.\- ]+/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
