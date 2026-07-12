import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderOtpEmail } from "@/lib/email/templates";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

export function generateOtp(): string {
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += randomInt(0, 10).toString();
  }
  return code;
}

export async function createAndSendOtp(
  userId: string,
  email: string,
  name: string,
): Promise<void> {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationCode: otp,
      emailVerificationExpiresAt: expiresAt,
    },
  });

  const html = await renderOtpEmail({ name, otp, expiryMinutes: OTP_EXPIRY_MINUTES }).catch(() => undefined);
  await sendEmail({
    to: email,
    subject: "Verify your email address — Kekere Stories",
    body: `Hi ${name},\n\nYour verification code is: ${otp}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.\n\nIf you didn't create this account, you can ignore this email.`,
    html,
  });
}

export async function resendOtp(
  email: string,
): Promise<{ success: true } | { error: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, emailVerified: true, email: true },
  });

  if (!user) {
    return { error: "No account found with this email." };
  }

  if (user.emailVerified) {
    return { error: "This email is already verified." };
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationCode: otp,
      emailVerificationExpiresAt: expiresAt,
    },
  });

  const html = await renderOtpEmail({ name: user.name, otp, expiryMinutes: OTP_EXPIRY_MINUTES }).catch(() => undefined);
  await sendEmail({
    to: user.email,
    subject: "Your new verification code — Kekere Stories",
    body: `Hi ${user.name},\n\nYour new verification code is: ${otp}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    html,
  });

  return { success: true };
}

export async function verifyOtp(
  email: string,
  otp: string,
): Promise<{ success: true } | { error: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
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
    from: "Obinna Ezeodili <obinna@narriva.pro>",
    body: `Hi ${name},\n\nI'm Obinna, co-founder and CEO of Kekere Stories. I'm genuinely glad you're here, and I can't wait for you to read all the short stories we've curated for you!\n\nYou see, we chose short fiction on purpose, not novels. Life in Lagos, in Nairobi, in London, wherever you're reading this from, doesn't leave much room for a 400-page commitment. But it always leaves room for one great story in the time it takes to wait for a bus, finish a meal, or fall asleep. Small doesn't mean small stakes. Some of the best storytelling we've ever read has happened in a few thousand words.\n\nI wonder which of our stories you'll read first 🙃\n\nCheers,\nObinna`,
  });
}
