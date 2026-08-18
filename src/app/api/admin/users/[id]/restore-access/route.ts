export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/logAction";
import { adminGeneratePasswordReset } from "@/lib/auth/reset-password";
import { OWNER_EMAIL } from "@/content/decisions";

/**
 * One-click "get this person back in" for support cases — an admin can't
 * see or reset a raw password (bcrypt-hashed, never recoverable by design),
 * so this issues a real reset link instead, the same mechanism the
 * self-service /forgot-password flow uses.
 *
 * Also clears the emailVerified gate if it was the actual blocker: a
 * password reset link alone doesn't get someone past NextAuth's separate
 * "EMAIL_NOT_VERIFIED" check (see auth/options.ts), so an account that never
 * completed OTP verification — e.g. because the verification email never
 * arrived — would still be locked out even with a working reset link.
 * Marking it verified here is an admin vouching for the request in place of
 * the OTP; logged like every other admin action on an account.
 *
 * Any admin can do this (same gate as suspend/unsuspend) — restoring access
 * isn't a privilege-escalation action like granting ADMIN.
 */
export const POST = withAuth(
  async (_request, session, { params }) => {
    const { id } = params as { id: string };

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, emailVerified: true, suspended: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // A generated reset link is a live credential for whoever holds it — an
    // admin issuing one for the owner's account would be a full account-
    // takeover path, undermining every other owner protection (role-lock,
    // un-suspendable, un-deletable, un-impersonatable) at once. The owner
    // recovers their own password through the same public /forgot-password
    // flow every other user has; it's untouched by this route.
    if (target.email === OWNER_EMAIL) {
      return NextResponse.json({ error: "Use the public password reset page for the owner's account." }, { status: 403 });
    }

    const wasUnverified = !target.emailVerified;
    if (wasUnverified) {
      await prisma.user.update({
        where: { id },
        data: {
          emailVerified: new Date(),
          emailVerificationCode: null,
          emailVerificationExpiresAt: null,
        },
      });
    }

    const result = await adminGeneratePasswordReset(id);
    if ("error" in result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await logAdminAction(session.user.id, id, "RESTORE_ACCESS", {
      markedVerified: wasUnverified,
      emailed: result.emailed,
    });

    return NextResponse.json({
      success: true,
      resetUrl: result.resetUrl,
      emailed: result.emailed,
      markedVerified: wasUnverified,
      stillSuspended: target.suspended,
    });
  },
  { roles: ["ADMIN"] },
);
