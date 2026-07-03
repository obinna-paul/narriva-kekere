export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { saveStory } from "@/lib/data/kekere-library";

const schema = z.object({ storyId: z.string().min(1) });

export const POST = withAuth(async (request, session) => {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const saved = await saveStory(session.user.id, parsed.data.storyId);
  return NextResponse.json({ saved }, { status: 201 });
});
