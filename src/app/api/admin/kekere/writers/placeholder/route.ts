export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { ensureReferralCodeForUser } from "@/lib/data/kekere-referrals";

const CLAIM_TOKEN_EXPIRY_DAYS = 120;

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const POST = withAuth(async (request, session) => {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, phone, bio } = parsed.data;
  const adminId = session.user.id;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, accountStatus: true, name: true },
  });

  if (existing) {
    return NextResponse.json({
      userId: existing.id,
      name: existing.name,
      alreadyExists: true,
      accountStatus: existing.accountStatus,
    });
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + CLAIM_TOKEN_EXPIRY_DAYS * 86400000);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: null,
      role: "WRITER",
      accountStatus: "UNCLAIMED",
      claimToken: tokenHash,
      claimTokenExpiresAt: expiresAt,
      createdByAdminId: adminId,
      wallet: { create: {} },
    },
    select: { id: true, name: true, email: true },
  });

  await ensureReferralCodeForUser(user.id);
  const referralCodeRecord = await prisma.referralCode.findUnique({ where: { userId: user.id }, select: { code: true } });
  if (referralCodeRecord) {
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: referralCodeRecord.code },
    });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://narriva.pro";
  const claimUrl = `${baseUrl}/kekere/claim/${token}`;

  return NextResponse.json({
    userId: user.id,
    name: user.name,
    email: user.email,
    claimUrl,
    claimToken: token,
  }, { status: 201 });
}, { roles: ["ADMIN"] });
