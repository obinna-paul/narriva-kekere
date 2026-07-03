export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ needsVerification: false });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { emailVerified: true },
  });

  return NextResponse.json({
    needsVerification: !!user && !user.emailVerified,
  });
}
