export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(async () => {
  const writers = await prisma.user.findMany({
    where: { accountStatus: "UNCLAIMED" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
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
      claimTokenExpiresAt: w.claimTokenExpiresAt?.toISOString() ?? null,
      storyCount: w.stories.length,
      storyTitle: w.stories[0]?.title ?? null,
      storyStatus: w.stories[0]?.status ?? null,
    })),
  });
}, { roles: ["ADMIN"] });
