export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { declineContract } from "@/lib/data/kekere-contracts";

const declineSchema = z.object({ token: z.string().min(1) });

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Lets a pre-launch writer decline their publishing offer straight from the
 * claim-link page, before they've ever created a password or logged in — so
 * this authenticates via the same claim token as GET/POST above rather than
 * a session, unlike the in-app decline route at
 * /api/kekere/contracts/[id]/decline (which requires an existing writer to
 * already be signed in).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = declineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const tokenHash = hashToken(parsed.data.token);

  const user = await prisma.user.findFirst({
    where: { claimToken: tokenHash, accountStatus: "UNCLAIMED" },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "This claim link is invalid or has already been used." },
      { status: 400 },
    );
  }

  const pendingContract = await prisma.kekereContract.findFirst({
    where: { writerId: user.id, status: "PENDING" },
    orderBy: { sentAt: "desc" },
    select: { id: true },
  });

  if (!pendingContract) {
    return NextResponse.json(
      { error: "No pending offer found for this account." },
      { status: 400 },
    );
  }

  const result = await declineContract(pendingContract.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
