export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { createReport } from "@/lib/data/kekere-reports";

const reportSchema = z.object({
  targetType: z.enum(["STORY", "PARAGRAPH_COMMENT"]),
  targetId: z.string().min(1),
  reason: z.enum(["PLAGIARISM", "HATE_SPEECH", "SEXUAL_CONTENT", "MISTAGGED", "BROKEN", "SPAM", "OTHER"]),
  details: z.string().max(500).optional(),
});

export const POST = withAuth(async (request, session) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createReport(
    session.user.id,
    parsed.data.targetType,
    parsed.data.targetId,
    parsed.data.reason,
    parsed.data.details
  );

  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ success: true });
});
