export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getStoryById } from "@/lib/data/kekere-stories";
import { tiptapDocToDocxBuffer } from "@/lib/tiptap/docx-export";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";

const EXPORTABLE_STATUSES = ["DRAFT", "REVISIONS_REQUESTED", "REJECTED"];

/** A writer can get their own words back out of the app whenever the story
 * is theirs to actively write: before they've ever submitted (DRAFT), while
 * they're working through requested revisions (REVISIONS_REQUESTED), or
 * after Kekere has rejected it (REJECTED). Everything else (SUBMITTED,
 * REVIEWING, PENDING_CONTRACT, CHANGES_PROPOSED, ACCEPTED) is mid-review or
 * on its way to publication, and PUBLISHED stories are already public —
 * none of those are exportable. */
export const GET = withAuth(async (_request, session, { params }: { params: { id: string } }) => {
  const story = await getStoryById(params.id);
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  if (story.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!EXPORTABLE_STATUSES.includes(story.status)) {
    return NextResponse.json(
      { error: "Only a draft (before submission) or a rejected story can be exported." },
      { status: 409 }
    );
  }

  const buffer = await tiptapDocToDocxBuffer(story.body as unknown as TiptapDoc, story.title, story.hookLine);
  const filename = `${story.title || "story"}.docx`.replace(/[^A-Za-z0-9.\- ]+/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
