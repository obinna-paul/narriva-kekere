import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { signImpersonationPayload } from "@/lib/auth/options";
import { logAdminAction } from "@/lib/admin/logAction";

export const POST = withAuth(
  async (_request, session, { params }) => {
    const adminId = session.user.id;
    const { userId } = params as { userId: string };

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
