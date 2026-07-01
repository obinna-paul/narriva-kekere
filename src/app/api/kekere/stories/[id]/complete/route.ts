import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { isStoryUnlocked } from "@/lib/data/kekere-stories";

export const POST = withAuth(async (_request, session, { params }: { params: { id: string } }) => {
  const story = await prisma.story.findUnique({
    where: { id: params.id },
    select: { id: true, cowrieCost: true, authorId: true },
  });
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const unlocked = await isStoryUnlocked(story, session.user.id);
  if (!unlocked) {
    return NextResponse.json({ error: "not_unlocked" }, { status: 403 });
  }

  await prisma.storyCompletion.upsert({
    where: { userId_storyId: { userId: session.user.id, storyId: params.id } },
    create: { userId: session.user.id, storyId: params.id, bonusCredited: false },
    update: {},
  });

  return NextResponse.json({ success: true });
});
