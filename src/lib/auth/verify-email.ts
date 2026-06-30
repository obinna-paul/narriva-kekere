import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";

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

  await sendEmail({
    to: email,
    subject: "Verify your email address",
    body: `Hi ${name},\n\nYour verification code is: ${otp}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.\n\nIf you didn't create this account, you can ignore this email.`,
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

  await sendEmail({
    to: user.email,
    subject: "Verify your email address",
    body: `Hi ${user.name},\n\nYour new verification code is: ${otp}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
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

  return { success: true };
}
