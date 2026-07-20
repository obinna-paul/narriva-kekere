export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { isStoryUnlocked } from "@/lib/data/kekere-stories";
import { recalculateCompletionRate } from "@/lib/data/kekere-progress";
import { recordReadingActivity } from "@/lib/data/kekere-streaks";

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

  // Whether this is the reader's first-ever completion of THIS story —
  // checked before the upsert so a repeat finish is distinguishable from a
  // brand-new one. Only a brand-new one advances the reading streak.
  const alreadyCompleted = await prisma.storyCompletion.findUnique({
    where: { userId_storyId: { userId: session.user.id, storyId: params.id } },
    select: { id: true },
  });

  await prisma.storyCompletion.upsert({
    where: { userId_storyId: { userId: session.user.id, storyId: params.id } },
    create: { userId: session.user.id, storyId: params.id, bonusCredited: false },
    update: {},
  });

  // The reading streak only advances on finishing a story you've never
  // finished before — re-reading and re-finishing the same story (even on a
  // new day) must not extend it, and mere scrolling never does. So record
  // today's activity only on a genuinely new completion.
  if (!alreadyCompleted) {
    await recordReadingActivity(session.user.id);
  }

  // fire-and-forget — don't block the response
  recalculateCompletionRate(params.id).catch(console.error);

  return NextResponse.json({ success: true });
});
