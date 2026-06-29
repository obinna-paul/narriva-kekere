import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/logAction";
import { sendEmail } from "@/lib/email/send";

const suspendSchema = z.object({
  reason: z.string().min(1),
  durationDays: z.number().int().positive().optional(),
});

export const POST = withAuth(
  async (request, session, { params }) => {
    const { id } = params as { id: string };

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (id === session.user.id) {
      return NextResponse.json({ error: "Cannot suspend yourself." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = suspendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { reason, durationDays } = parsed.data;

    let suspendedUntil: Date | null = null;
    if (durationDays) {
      suspendedUntil = new Date(Date.now() + durationDays * 86400000);
    }

    await prisma.user.update({
      where: { id },
      data: {
        suspended: true,
        suspensionReason: reason,
        suspendedUntil,
      },
    });

    await logAdminAction(session.user.id, id, "SUSPEND", {
      reason,
      durationDays: durationDays ?? null,
    });

    if (target.email) {
      await sendEmail({
        to: target.email,
        subject: "Your account has been suspended",
        body: "Your account has been suspended. If you believe this is in error, contact support@narriva.pro.",
      });
    }

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] },
);
