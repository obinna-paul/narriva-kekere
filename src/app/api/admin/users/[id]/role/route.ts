export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getSetting } from "@/lib/settings/get";
import { logAdminAction } from "@/lib/admin/logAction";

const SUPER_ADMIN_DEFAULT = "ezeodilipaul@gmail.com";

const roleSchema = z.object({
  role: z.enum(["READER", "WRITER", "ADMIN"]),
});

// Granting ADMIN is a privilege-escalation action, so — unlike suspend/unsuspend,
// which any admin can do — this is restricted to the super admin only, same gate
// as manual cowrie adjustments.
export const PATCH = withAuth(
  async (request, session, { params }) => {
    const { id } = params as { id: string };

    const superAdminEmail = await getSetting("super_admin_email", SUPER_ADMIN_DEFAULT);
    if (session.user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (id === session.user.id) {
      return NextResponse.json({ error: "Cannot change your own role." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { role } = parsed.data;
    if (role === target.role) {
      return NextResponse.json({ success: true, role });
    }

    await prisma.user.update({ where: { id }, data: { role } });
    await logAdminAction(session.user.id, id, "ROLE_CHANGE", { from: target.role, to: role });

    return NextResponse.json({ success: true, role });
  },
  { roles: ["ADMIN"] }
);
