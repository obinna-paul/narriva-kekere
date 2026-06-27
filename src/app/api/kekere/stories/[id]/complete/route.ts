import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { markStoryComplete } from "@/lib/data/kekere-completions";
import { creditReadReward } from "@/lib/data/kekere-referrals";
import { prisma } from "@/lib/db/prisma";

export const POST = withAuth(async (_request, session, { params }: { params: { id: string } }) => {
  const story = await prisma.story.findUnique({
    where: { id: params.id },
    select: { cowrieCost: true },
  });

  await markStoryComplete(session.user.id, params.id);

  if (story && story.cowrieCost > 0) {
    await creditReadReward(session.user.id, params.id);
  }

  return NextResponse.json({ ok: true });
});
