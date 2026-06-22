import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { CompetitionEntryError, CompetitionNotFoundError, submitStoryToCompetition } from "@/lib/data/kekere-competitions";

const schema = z.object({ storyId: z.string().min(1) });

export const POST = withAuth(
  async (request, session, { params }: { params: { id: string } }) => {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const entry = await submitStoryToCompetition(params.id, session.user.id, parsed.data.storyId);
      return NextResponse.json({ entry }, { status: 201 });
    } catch (error) {
      if (error instanceof CompetitionNotFoundError) {
        return NextResponse.json({ error: "Competition not found" }, { status: 404 });
      }
      if (error instanceof CompetitionEntryError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }
  }
);
