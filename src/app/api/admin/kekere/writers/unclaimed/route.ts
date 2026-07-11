export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

// Lists every writer an admin onboarded (placeholder accounts), whether or
// not they've claimed yet. Unclaimed ones still need a claim link / resend;
// claimed ones are kept here too so an admin can still find and delete a
// test story after it went live (a claimed writer leaves the "unclaimed"
// set, but its onboarded story is exactly what an admin wants to clean up).
export const GET = withAuth(async () => {
  const writers = await prisma.user.findMany({
    where: { createdByAdminId: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      accountStatus: true,
      claimTokenExpiresAt: true,
      stories: {
        select: { id: true, title: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    writers: writers.map((w) => ({
      id: w.id,
      name: w.name,
      email: w.email,
      createdAt: w.createdAt.toISOString(),
      accountStatus: w.accountStatus,
      claimTokenExpiresAt: w.claimTokenExpiresAt?.toISOString() ?? null,
      storyCount: w.stories.length,
      storyId: w.stories[0]?.id ?? null,
      storyTitle: w.stories[0]?.title ?? null,
      storyStatus: w.stories[0]?.status ?? null,
    })),
  });
}, { roles: ["ADMIN"] });
