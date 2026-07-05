import { randomBytes, createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderResetPasswordEmail } from "@/lib/email/templates";

const RESET_EXPIRY_MINUTES = 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  // Silent return — never reveal whether an email exists
  if (!user || !user.emailVerified) return;

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60_000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: tokenHash,
      passwordResetExpiresAt: expiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://narriva.pro";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const html = await renderResetPasswordEmail({
    name: user.name,
    resetUrl,
    expiryMinutes: RESET_EXPIRY_MINUTES,
  }).catch(() => undefined);

  await sendEmail({
    to: user.email,
    subject: "Reset your password — Kekere Stories",
    body: `Hi ${user.name},\n\nWe received a request to reset your Kekere Stories password.\n\nClick the link below to set a new password (expires in ${RESET_EXPIRY_MINUTES} minutes):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email. Your password won't change.\n\nThe Kekere Stories Team`,
    html,
  });
}

export async function applyPasswordReset(
  token: string,
  newPassword: string,
): Promise<{ success: true } | { error: string }> {
  const tokenHash = hashToken(token);

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: tokenHash },
    select: { id: true, passwordResetExpiresAt: true },
  });

  if (!user) {
    return { error: "This reset link is invalid or has already been used." };
  }

  if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: null, passwordResetExpiresAt: null },
    });
    return { error: "This reset link has expired. Please request a new one." };
  }

  const hashedPassword = await hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  return { success: true };
}
