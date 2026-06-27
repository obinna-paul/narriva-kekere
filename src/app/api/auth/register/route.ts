import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";
import { generateReferralCode } from "@/lib/data/kekere-referrals";

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(72),
  termsAccepted: z.boolean(),
  turnstileToken: z.string().min(1),
  referralCode: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, name, password, termsAccepted, turnstileToken, referralCode } = parsed.data;

  const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstileToken(turnstileToken, remoteIp))) {
    return NextResponse.json({ error: "Verification failed — please try again" }, { status: 400 });
  }

  if (!termsAccepted) {
    return NextResponse.json(
      { error: "Terms must be accepted to register" },
      { status: 400 },
    );
  }

  let referredBy: string | null = null;
  if (referralCode && referralCode.trim()) {
    const inviter = await prisma.user.findUnique({
      where: { referralCode: referralCode.trim() },
      select: { id: true },
    });
    if (!inviter) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    }
    referredBy = referralCode.trim();
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const userReferralCode = generateReferralCode(name);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        termsAcceptedAt: new Date(),
        referralCode: userReferralCode,
        referredBy,
        wallet: { create: { balance: 0 } },
      },
      select: { id: true, email: true, name: true, role: true, referralCode: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    throw error;
  }
}