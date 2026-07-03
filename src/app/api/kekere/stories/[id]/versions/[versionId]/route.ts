export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getStoryForAuthor, StoryForbiddenError, StoryNotFoundError } from "@/lib/data/kekere-stories";
import { getVersion, VersionNotFoundError } from "@/lib/data/kekere-story-versions";

export const GET = withAuth(
  async (_request, session, { params }: { params: { id: string; versionId: string } }) => {
    try {
      await getStoryForAuthor(params.id, session.user.id);
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
      const version = await getVersion(params.id, params.versionId);
      return NextResponse.json({ version });
    } catch (error) {
      if (error instanceof VersionNotFoundError) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }
      throw error;
    }
  }
);
