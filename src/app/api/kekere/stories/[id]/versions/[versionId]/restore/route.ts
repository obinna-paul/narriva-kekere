import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getStoryForAuthor, StoryForbiddenError, StoryNotFoundError } from "@/lib/data/kekere-stories";
import {
  restoreVersion,
  RestoreIllegalStateError,
  VersionNotFoundError,
} from "@/lib/data/kekere-story-versions";
import { createNotification } from "@/lib/notifications/create";

export const POST = withAuth(
  async (_request, session, { params }: { params: { id: string; versionId: string } }) => {
    let story;
    try {
      story = await getStoryForAuthor(params.id, session.user.id);
    } catch (error) {
      if (error instanceof StoryNotFoundError) {
        return NextResponse.json({ error: "Story not found" }, { status: 404 });
      }
      if (error instanceof StoryForbiddenError) {
        return NextResponse.json({ error: "Not your story" }, { status: 403 });
      }
      throw error;
    }

    try {
      const result = await restoreVersion(params.id, params.versionId);

      await createNotification({
        userId: story.authorId,
        type: "VERSION_RESTORED",
        title: "Story version restored",
        body: `"${story.title}" has been restored to the version from ${result.restoredFrom.savedAt.toLocaleString()}. A backup of the previous content was saved.`,
        link: `/kekere/write?id=${story.id}`,
      });

      return NextResponse.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof VersionNotFoundError) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }
      if (error instanceof RestoreIllegalStateError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }
  }
);
