import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";

/** Idempotent — calling this again after a request is already pending just
 * returns the existing timestamp rather than resetting the clock. */
export async function requestAccountDeletion(userId: string): Promise<Date> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, deletionRequestedAt: true },
  });
  if (!user) throw new Error("User not found");

  if (user.deletionRequestedAt) return user.deletionRequestedAt;

  const requestedAt = new Date();
  await prisma.user.update({ where: { id: userId }, data: { deletionRequestedAt: requestedAt } });

  await sendEmail({
    to: user.email,
    subject: "We've received your account deletion request",
    body: `We've received your request to delete your account. Orders, submissions, and transaction records are retained for 7 years for legal/financial record-keeping; the rest of your personal data will be deleted within 30 days. If you didn't request this, contact support immediately.`,
  });

  return requestedAt;
}

export async function cancelAccountDeletion(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { deletionRequestedAt: null } });
}

export interface PendingDeletionRow {
  id: string;
  email: string;
  name: string;
  deletionRequestedAt: Date;
}

export async function listPendingAccountDeletions(): Promise<PendingDeletionRow[]> {
  const users = await prisma.user.findMany({
    where: { deletionRequestedAt: { not: null } },
    select: { id: true, email: true, name: true, deletionRequestedAt: true },
    orderBy: { deletionRequestedAt: "asc" },
  });
  return users as PendingDeletionRow[];
}

/** Marks a pending request as handled. Does NOT purge any data — the actual
 * data-purge job is an operational task outside this phase's scope; this
 * just clears the request off the queue and logs that an admin processed it. */
export async function markAccountDeletionProcessed(userId: string, adminId: string): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { deletionRequestedAt: null } }),
    prisma.adminAuditLog.create({
      data: {
        adminId,
        action: "PROCESS_ACCOUNT_DELETION",
        targetType: "User",
        targetId: userId,
        note: "Marked account deletion request as processed (manual data purge handled out-of-band).",
      },
    }),
  ]);
}
