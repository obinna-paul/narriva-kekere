import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { isStoryUnlocked } from "@/lib/data/kekere-stories";
import { creditCompletionBonus } from "@/lib/economy/cowries";

export const POST = withAuth(async (_request, session, { params }: { params: { id: string } }) => {
  const story = await prisma.story.findUnique({
    where: { id: params.id },
    select: { id: true, cowrieCost: true, authorId: true },
  });
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  // Server-side check — never trust the client's claim that it has finished
  // a story it never paid to unlock.
  const unlocked = await isStoryUnlocked(story, session.user.id);
  if (!unlocked) {
    return NextResponse.json({ error: "not_unlocked" }, { status: 403 });
  }

  const result = await creditCompletionBonus(session.user.id, params.id);
  return NextResponse.json(result);
});
