export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { signImpersonationPayload } from "@/lib/auth/options";
import { logAdminAction } from "@/lib/admin/logAction";
import { OWNER_EMAIL } from "@/content/decisions";

export const POST = withAuth(
  async (_request, session, { params }) => {
    const adminId = session.user.id;
    const { userId } = params as { userId: string };

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Impersonation doesn't grant the impersonator any extra permissions
    // (withAuth's role check always uses the real admin's own role — see the
    // actualAdminId comment there), so it's not a dethroning vector. It does
    // let the actor browse as the target for 15 minutes, which for the owner
    // account is a privacy line worth holding regardless.
    if (target.email === OWNER_EMAIL) {
      return NextResponse.json({ error: "The owner's account can't be impersonated." }, { status: 403 });
    }

    const expiresAt = Date.now() + 15 * 60 * 1000;

    const token = signImpersonationPayload({
      impersonatingAdminId: adminId,
      impersonatedUserId: userId,
      expiresAt,
    });

    await logAdminAction(adminId, userId, "IMPERSONATION_START", {});

    const response = NextResponse.json({ success: true });

    response.cookies.set("impersonation_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    return response;
  },
  { roles: ["ADMIN"] },
);
