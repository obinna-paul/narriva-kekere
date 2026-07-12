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
    // Anyone in the admin onboarding pipeline: a placeholder we created
    // (createdByAdminId set), OR — crucially — a writer who ALREADY had a
    // real account for whom we authored a story. The latter has
    // createdByAdminId = null (they signed up themselves), so without the
    // sourceType clause they'd silently never appear here, leaving the admin
    // with no "Send email" button for them.
    where: {
      OR: [
        { createdByAdminId: { not: null } },
        { stories: { some: { sourceType: "ADMIN_AUTHORED" } } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      accountStatus: true,
      claimTokenExpiresAt: true,
      stories: {
        // Only the admin-authored story — an existing writer may also have
        // their own self-submitted stories, which aren't what this view
        // manages and would otherwise show the wrong title/status.
        where: { sourceType: "ADMIN_AUTHORED" },
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
