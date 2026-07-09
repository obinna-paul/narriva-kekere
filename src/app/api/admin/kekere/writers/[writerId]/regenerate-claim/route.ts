export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

const CLAIM_TOKEN_EXPIRY_DAYS = 120;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const POST = withAuth(async (_request, _session, { params }) => {
  const { writerId } = params as { writerId: string };

  const writer = await prisma.user.findUnique({
    where: { id: writerId },
    select: { id: true, accountStatus: true },
  });

  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }

  if (writer.accountStatus !== "UNCLAIMED") {
    return NextResponse.json({ error: "Writer is already claimed" }, { status: 400 });
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + CLAIM_TOKEN_EXPIRY_DAYS * 86400000);

  await prisma.user.update({
    where: { id: writerId },
    data: {
      claimToken: tokenHash,
      claimTokenExpiresAt: expiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://narriva.pro";
  const claimUrl = `${baseUrl}/kekere/claim/${token}`;

  return NextResponse.json({ claimUrl, claimToken: token });
}, { roles: ["ADMIN"] });
