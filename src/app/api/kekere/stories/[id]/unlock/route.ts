import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { unlockStory } from "@/lib/economy/cowries";
import { triggerReferralRewardOnFirstUnlock } from "@/lib/data/kekere-referrals";

export const POST = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    const result = await unlockStory(session.user.id, params.id);

    if ("error" in result) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if ("insufficient_balance" in result) {
      return NextResponse.json(
        {
          error: "insufficient_balance",
          message: "You don't have enough cowries for this one yet.",
          required: result.needed,
          balance: result.balance,
        },
        { status: 402 }
      );
    }

    if ("already_unlocked" in result) {
      return NextResponse.json({ balance: result.balance });
    }

    triggerReferralRewardOnFirstUnlock(session.user.id).catch(() => {});
    return NextResponse.json({ balance: result.balance });
  }
);
