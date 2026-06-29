import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { verifyImpersonationPayload } from "@/lib/auth/options";
import { logAdminAction } from "@/lib/admin/logAction";

export const POST = withAuth(
  async (request, session) => {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/impersonation_token=([^;]+)/);

    if (!match) {
      return NextResponse.json(
        { error: "No active impersonation session." },
        { status: 400 },
      );
    }

    const payload = verifyImpersonationPayload(match[1]);

    if (!payload) {
      const response = NextResponse.json(
        { error: "Invalid or expired impersonation token." },
        { status: 400 },
      );
      response.cookies.set("impersonation_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    const impersonatedUserId = payload.impersonatedUserId as string;
    const startTime = payload.iat
      ? Math.floor((Date.now() - (payload.iat as number)) / 1000)
      : null;

    await logAdminAction(
      session.user.actualAdminId ?? session.user.id,
      impersonatedUserId,
      "IMPERSONATION_END",
      startTime ? { durationSecs: startTime } : {},
    );

    const response = NextResponse.json({ success: true });

    response.cookies.set("impersonation_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  },
  { roles: ["ADMIN"] },
);
