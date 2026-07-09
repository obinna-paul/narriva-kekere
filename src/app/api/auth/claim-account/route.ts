export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { signContractAndPublishStory } from "@/lib/data/kekere-contracts";

const claimSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(72),
  signedName: z.string().min(1, "Full legal name is required to sign"),
});

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, error: "Missing token" }, { status: 400 });
  }

  const tokenHash = hashToken(token);

  const user = await prisma.user.findFirst({
    where: { claimToken: tokenHash, accountStatus: "UNCLAIMED" },
    select: {
      id: true,
      name: true,
      claimTokenExpiresAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ valid: false });
  }

  if (user.claimTokenExpiresAt && user.claimTokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ valid: false, expired: true });
  }

  const pendingContract = await prisma.kekereContract.findFirst({
    where: { writerId: user.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      body: true,
      story: { select: { title: true } },
    },
  });

  return NextResponse.json({
    valid: true,
    writerName: user.name,
    storyTitle: pendingContract?.story?.title ?? null,
    contractBody: pendingContract?.body ?? null,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { token, password, signedName } = parsed.data;
  const tokenHash = hashToken(token);

  const user = await prisma.user.findFirst({
    where: { claimToken: tokenHash, accountStatus: "UNCLAIMED" },
    select: {
      id: true,
      name: true,
      email: true,
      claimTokenExpiresAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "This claim link is invalid or has already been used." },
      { status: 400 },
    );
  }

  if (user.claimTokenExpiresAt && user.claimTokenExpiresAt.getTime() < Date.now()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { claimToken: null, claimTokenExpiresAt: null },
    });
    return NextResponse.json(
      { error: "This claim link has expired. Please contact support." },
      { status: 400 },
    );
  }

  const pendingContract = await prisma.kekereContract.findFirst({
    where: {
      writerId: user.id,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, storyId: true, body: true },
  });

  if (!pendingContract) {
    return NextResponse.json(
      { error: "No pending contract found for this account." },
      { status: 400 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ?? "unknown";

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      emailVerified: new Date(),
      accountStatus: "CLAIMED",
      claimToken: null,
      claimTokenExpiresAt: null,
    },
  });

  const signResult = await signContractAndPublishStory({
    contractId: pendingContract.id,
    signedName,
    signerIp: ip,
  });

  return NextResponse.json({
    success: true,
    storyId: signResult.storyId,
    contractId: pendingContract.id,
    writerEmail: user.email,
  });
}
