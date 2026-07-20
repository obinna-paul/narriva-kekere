export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({ enabled: z.boolean() });

export const PUT = withAuth(async (request, session) => {
  const requestBody = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emailNotificationsEnabled: parsed.data.enabled },
  });

  return NextResponse.json({ success: true });
});
