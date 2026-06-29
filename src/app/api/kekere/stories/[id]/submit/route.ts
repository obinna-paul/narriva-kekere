import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  StoryForbiddenError,
  StoryIllegalStateError,
  StoryNotFoundError,
  submitStory,
} from "@/lib/data/kekere-stories";
import { createNotification } from "@/lib/notifications/create";

export const POST = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    try {
      const story = await submitStory(params.id, session.user.id);

      await createNotification({
        userId: story.authorId,
        type: "STORY_SUBMITTED",
        title: "Story submitted for review",
        body: `Your story "${story.title}" is now being reviewed. We'll come back to you within 5–7 business days.`,
        link: `/kekere/write?id=${story.id}`,
      });

      return NextResponse.json({ story });
    } catch (error) {
      if (error instanceof StoryNotFoundError) {
        return NextResponse.json({ error: "Story not found" }, { status: 404 });
      }
      if (error instanceof StoryForbiddenError) {
        return NextResponse.json({ error: "Not your story" }, { status: 403 });
      }
      if (error instanceof StoryIllegalStateError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }
  }
);
