export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { OWNER_EMAIL } from "@/content/decisions";

/**
 * Who's actually signed in, for the admin chrome (sidebar name + Owner
 * badge) — the session JWT's name/email can be stale (see the withAuth
 * comment on why role is re-read from the DB), and isOwner is computed
 * server-side so the check itself, and the OWNER_EMAIL constant it reads,
 * never has to reach the client.
 */
export const GET = withAuth(
  async (_request, session) => {
    // Same actualAdminId fallback withAuth uses for the role check — while
    // impersonating, session.user.id is swapped to the impersonated reader,
    // but the admin chrome should always identify the real, logged-in admin.
    const userId = session.user.actualAdminId ?? session.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      role: user.role,
      isOwner: user.email === OWNER_EMAIL,
    });
  },
  { roles: ["ADMIN"] },
);
