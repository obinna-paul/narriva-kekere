import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { InsufficientBalanceError, StoryNotAvailableError, unlockStory } from "@/lib/data/kekere-unlocks";
import { creditReferrer } from "@/lib/data/kekere-referrals";

export const POST = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    try {
      const result = await unlockStory(session.user.id, params.id);
      creditReferrer(session.user.id).catch(() => {});
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof InsufficientBalanceError) {
        return NextResponse.json(
          {
            error: "insufficient_balance",
            message: "You don't have enough cowries for this one yet.",
            required: error.required,
            balance: error.balance,
          },
          { status: 402 }
        );
      }
      if (error instanceof StoryNotAvailableError) {
        return NextResponse.json({ error: "Story not found" }, { status: 404 });
      }
      throw error;
    }
  }
);
