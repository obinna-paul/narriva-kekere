import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  StoryForbiddenError,
  StoryIllegalStateError,
  StoryNotFoundError,
  submitStory,
} from "@/lib/data/kekere-stories";

export const POST = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    try {
      const story = await submitStory(params.id, session.user.id);
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
