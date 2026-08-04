import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderOtpEmail } from "@/lib/email/templates";
import { KEKERE_GENERAL_FROM, NARRIVA_GENERAL_FROM, OBINNA_FROM } from "@/lib/constants";

type Brand = "kekere" | "narriva";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
// Floor between two OTP sends to the same account. Without this, hitting
// "resend" twice (a fast double-click, or a page refresh right after
// registering) generates a second code that overwrites the first in the DB
// — so if the two emails arrive out of order, or the first is just running
// a few seconds behind, the reader types a code that's no longer valid and
// it reads to them as "I never got a working code."
const RESEND_COOLDOWN_SECONDS = 45;

export function generateOtp(): string {
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += randomInt(0, 10).toString();
  }
  return code;
}

export type OtpSendResult =
  | { sent: true }
  | { sent: false; reason: "recently_sent"; retryAfterSeconds: number }
  | { sent: false; reason: "send_failed" };

/**
 * Generates a code and emails it. Returns whether the email actually went
 * out — sendEmail() itself never throws on a Resend failure (see its doc
 * comment), so a caller that discards this return value would tell the
 * reader "check your email" for a code that never left the server. The DB
 * row is only written AFTER a successful send, not before: writing first
 * (the old behaviour) meant a failed send still left a "valid" code sitting
 * in the database that no email ever delivered, silently blocking a
 * same-second retry from working either.
 */
export async function createAndSendOtp(
  userId: string,
  email: string,
  name: string,
  options?: { isResend?: boolean; brand?: Brand },
): Promise<OtpSendResult> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerificationExpiresAt: true },
  });

  if (existing?.emailVerificationExpiresAt) {
    const msRemaining = existing.emailVerificationExpiresAt.getTime() - Date.now();
    const secondsSinceIssued = OTP_EXPIRY_MINUTES * 60 - msRemaining / 1000;
    if (msRemaining > 0 && secondsSinceIssued < RESEND_COOLDOWN_SECONDS) {
      return {
        sent: false,
        reason: "recently_sent",
        retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceIssued),
      };
    }
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000);
  const isResend = options?.isResend ?? false;
  const brand = options?.brand ?? "kekere";
  const brandName = brand === "kekere" ? "Kekere Stories" : "Narriva";
  const from = brand === "kekere" ? KEKERE_GENERAL_FROM : NARRIVA_GENERAL_FROM;

  const html = await renderOtpEmail({ name, otp, expiryMinutes: OTP_EXPIRY_MINUTES, brand }).catch(() => undefined);
  const result = await sendEmail({
    to: email,
    subject: isResend ? `Your new verification code — ${brandName}` : `Verify your email address — ${brandName}`,
    body: isResend
      ? `Hi ${name},\n\nYour new verification code is: ${otp}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.`
      : `Hi ${name},\n\nYour verification code is: ${otp}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.\n\nIf you didn't create this account, you can ignore this email.`,
    from,
    html,
  });

  if (!result.success) {
    return { sent: false, reason: "send_failed" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationCode: otp,
      emailVerificationExpiresAt: expiresAt,
    },
  });

  return { sent: true };
}

export async function resendOtp(
  email: string,
  brand: Brand = "kekere",
): Promise<{ success: true } | { error: string }> {
  // Case-insensitive — see the matching comment in /api/auth/register for
  // why (an account may still have whatever case it was originally typed
  // in, from before email normalization existed).
  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { id: true, name: true, emailVerified: true, email: true },
  });

  if (!user) {
    return { error: "No account found with this email." };
  }

  if (user.emailVerified) {
    return { error: "This email is already verified." };
  }

  const result = await createAndSendOtp(user.id, user.email, user.name, { isResend: true, brand });

  if (!result.sent) {
    if (result.reason === "recently_sent") {
      return { error: `Please wait ${result.retryAfterSeconds}s before requesting another code.` };
    }
    return { error: "Couldn't send your code — please try again in a moment." };
  }

  return { success: true };
}

export async function verifyOtp(
  email: string,
  otp: string,
): Promise<{ success: true } | { error: string }> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      emailVerificationCode: true,
      emailVerificationExpiresAt: true,
    },
  });

  if (!user) {
    return { error: "No account found with this email." };
  }

  if (user.emailVerified) {
    return { error: "This email is already verified." };
  }

  if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
    return { error: "No verification code requested. Please sign up again." };
  }

  if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
    return { error: "This verification code has expired. Please request a new one." };
  }

  if (user.emailVerificationCode !== otp) {
    return { error: "Invalid verification code. Please check and try again." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      emailVerificationCode: null,
      emailVerificationExpiresAt: null,
    },
  });

  // Send welcome email now that the address is confirmed.
  await sendWelcomeEmail(user.name, user.email);

  return { success: true };
}

/**
 * The personal welcome-from-the-CEO email, sent once when an account first
 * becomes usable. Fired from OTP verification for normal signups, and from
 * the claim flow for a pre-launch writer claiming their placeholder account
 * (which is auto-verified and so never goes through OTP). Plain text only,
 * deliberately no HTML — a designed template with a logo/card reads as bulk
 * mail to Gmail's tab classifier, plain text from a real name reads as a
 * personal note, which is what this actually is.
 */
export async function sendWelcomeEmail(name: string, email: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Welcome to Kekere Stories",
    from: OBINNA_FROM,
    body: `Hi ${name},\n\nI'm Obinna, co-founder and CEO of Kekere Stories. I'm genuinely glad you're here, and I can't wait for you to read all the short stories we've curated for you!\n\nYou see, we chose short fiction on purpose, not novels. Life in Lagos, in Nairobi, in London, wherever you're reading this from, doesn't leave much room for a 400-page commitment. But it always leaves room for one great story in the time it takes to wait for a bus, finish a meal, or fall asleep. Small doesn't mean small stakes. Some of the best storytelling we've ever read has happened in a few thousand words.\n\nI wonder which of our stories you'll read first 🙃\n\nCheers,\nObinna`,
  });
}
