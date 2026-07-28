export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { getUserTagPreferences, setUserTagPreferences } from "@/lib/data/kekere-preferences";

export const GET = withAuth(async (_request, session) => {
  const { explicit, autoDetected } = await getUserTagPreferences(session.user.id);
  return NextResponse.json({ explicit, autoDetected });
});

const bodySchema = z.object({ tagSlugs: z.array(z.string()).max(53) });

export const PUT = withAuth(async (request, session) => {
  const requestBody = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const explicit = await setUserTagPreferences(session.user.id, parsed.data.tagSlugs);
  return NextResponse.json({ explicit });
});
