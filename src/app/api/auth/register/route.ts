export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";
import { ensureReferralCodeForUser, recordReferralFromCode } from "@/lib/data/kekere-referrals";
import { getFeatureFlag } from "@/lib/settings/get";
import { createAndSendOtp } from "@/lib/auth/verify-email";

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

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    // A placeholder account (created by an admin for pre-launch onboarding,
    // e.g. a writer who declined their publishing offer before ever signing
    // up) sits on this email with no password. Rather than let the unique
    // email constraint block a genuine signup with a confusing "account
    // already exists" error, adopt that row into a real account — same
    // outcome as prisma.user.create below, just reusing the existing id.
    const placeholder = await prisma.user.findUnique({
      where: { email },
      select: { id: true, accountStatus: true, password: true },
    });

    const user = placeholder && placeholder.accountStatus === "UNCLAIMED" && !placeholder.password
      ? await prisma.user.update({
          where: { id: placeholder.id },
          data: {
            name,
            password: hashedPassword,
            termsAcceptedAt: new Date(),
            accountStatus: "CLAIMED",
            claimToken: null,
            claimTokenExpiresAt: null,
          },
          select: { id: true, email: true, name: true, role: true },
        })
      : await prisma.user.create({
          data: {
            email,
            name,
            password: hashedPassword,
            termsAcceptedAt: new Date(),
            wallet: { create: {} },
          },
          select: { id: true, email: true, name: true, role: true },
        });

    // The placeholder path above doesn't create a wallet inline like the
    // fresh-user path does — ensure one exists either way (upsert is a
    // no-op if the admin's placeholder-creation route already made one).
    await prisma.wallet.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });

    await createAndSendOtp(user.id, user.email, user.name);

    const newReferralCode = await ensureReferralCodeForUser(user.id);
    // Kept in sync with ReferralCode.code so the existing wallet-page
    // "Your referral code" display (which still reads this legacy column)
    // doesn't regress now that code generation/lookup has moved to the
    // dedicated ReferralCode model.
    await prisma.user.update({ where: { id: user.id }, data: { referralCode: newReferralCode } });

    // The /invite/[code] link sets this cookie; a manually-typed code in
    // the signup form arrives in the request body instead. Either is
    // resolved through the same lookup — an invalid or self-referral code
    // is silently ignored, never a registration error.
    const cookieCode = (await cookies()).get("referral_code")?.value;
    const codeToUse = cookieCode ?? referralCode;
    if (codeToUse) {
      const referralEnabled = await getFeatureFlag("referral_program", true);
      if (referralEnabled) {
        await recordReferralFromCode(codeToUse, user.id);
      }
    }

    return NextResponse.json(
      { user: { ...user, referralCode: newReferralCode }, pendingVerification: true },
      { status: 201 },
    );
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
