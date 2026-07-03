export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

const voidSchema = z.object({
  reason: z.string().min(1),
});

export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { id } = params as { id: string };

    const contract = await prisma.kekereContract.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    if (contract.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending contracts can be voided." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = voidSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Reason is required.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await prisma.kekereContract.update({
      where: { id },
      data: { status: "VOIDED" },
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] },
);
