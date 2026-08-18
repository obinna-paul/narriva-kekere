import { randomBytes, createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderResetPasswordEmail } from "@/lib/email/templates";
import { KEKERE_GENERAL_FROM } from "@/lib/constants";
import { publicUrl } from "@/lib/urls";

const RESET_EXPIRY_MINUTES = 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * The DB write shared by every reset path: mints a token, stores its hash
 * (never the token itself — same reasoning as an OTP or session secret), and
 * returns the real link. Callers decide whether/how to deliver it.
 */
async function issuePasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60_000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetToken: tokenHash,
      passwordResetExpiresAt: expiresAt,
    },
  });

  return publicUrl(`/reset-password?token=${token}`);
}

export async function createPasswordReset(email: string): Promise<void> {
  // Case-insensitive, matching the OTP resend/verify lookups — an account
  // created before email normalization (or via any path that didn't
  // lowercase) can be stored in mixed case, and a case-sensitive findUnique
  // here would silently miss it: the caller still shows "check your email",
  // but no email is ever sent. findFirst + insensitive closes that gap.
  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  // Silent return — never reveal whether an email exists
  if (!user || !user.emailVerified) return;

  const resetUrl = await issuePasswordResetToken(user.id);

  const html = await renderResetPasswordEmail({
    name: user.name,
    resetUrl,
    expiryMinutes: RESET_EXPIRY_MINUTES,
  }).catch(() => undefined);

  await sendEmail({
    to: user.email,
    subject: "Reset your password — Kekere Stories",
    body: `Hi ${user.name},\n\nWe received a request to reset your Kekere Stories password.\n\nClick the link below to set a new password (expires in ${RESET_EXPIRY_MINUTES} minutes):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email. Your password won't change.\n\nThe Kekere Stories Team`,
    from: KEKERE_GENERAL_FROM,
    html,
  });
}

/**
 * Admin-initiated reset for a user who can't get in and can't rely on the
 * self-service email arriving (unverified account, or email deliverability
 * is in doubt). Unlike createPasswordReset, this doesn't require
 * emailVerified — an admin is vouching for the request, not the inbox — and
 * it always hands back the real link, so it works even if the best-effort
 * email attempt below fails outright.
 */
export async function adminGeneratePasswordReset(
  userId: string,
): Promise<{ resetUrl: string; emailed: boolean } | { error: "not_found" }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return { error: "not_found" };

  const resetUrl = await issuePasswordResetToken(user.id);

  const html = await renderResetPasswordEmail({
    name: user.name,
    resetUrl,
    expiryMinutes: RESET_EXPIRY_MINUTES,
  }).catch(() => undefined);

  const result = await sendEmail({
    to: user.email,
    subject: "Reset your password — Kekere Stories",
    body: `Hi ${user.name},\n\nAn admin generated this link so you can get back into your Kekere Stories account.\n\nClick the link below to set a new password (expires in ${RESET_EXPIRY_MINUTES} minutes):\n${resetUrl}\n\nThe Kekere Stories Team`,
    from: KEKERE_GENERAL_FROM,
    html,
  });

  return { resetUrl, emailed: result.success };
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
