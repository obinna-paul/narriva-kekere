export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { changePassword } from "@/lib/auth/change-password";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export const POST = withAuth(async (request, session) => {
  const requestBody = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await changePassword(session.user.id, parsed.data.currentPassword, parsed.data.newPassword);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
});
