export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

const holdSchema = z.object({ note: z.string().optional() });

export const PUT = withAuth(
  async (request, _session, { params }: { params: { id: string } }) => {
    const body = await request.json().catch(() => ({}));
    const parsed = holdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.withdrawalRequest.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }

    // Internal annotation only — status is deliberately left untouched.
    await prisma.withdrawalRequest.update({
      where: { id: params.id },
      data: { adminNote: parsed.data.note ?? null },
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] }
);
