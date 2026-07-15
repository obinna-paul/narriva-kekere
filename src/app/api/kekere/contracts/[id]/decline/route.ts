export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { declineContract } from "@/lib/data/kekere-contracts";

const declineSchema = z.object({
  reason: z.string().optional(),
});

export const POST = withAuth(async (request, session, { params }) => {
  const writerId = session.user.id;
  const { id } = params as { id: string };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = declineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const contract = await prisma.kekereContract.findUnique({
    where: { id },
    select: { writerId: true, status: true },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  if (contract.writerId !== writerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (contract.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only pending contracts can be declined." },
      { status: 400 },
    );
  }

  const result = await declineContract(id, parsed.data.reason);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
});
