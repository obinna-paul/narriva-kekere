export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const stories = await prisma.story.findMany({
      where: { title: { contains: "Jonathan", mode: "insensitive" } },
      select: {
        id: true,
        title: true,
        status: true,
        publishedAt: true,
        tags: {
          select: {
            tag: {
              select: { id: true, slug: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(stories);
  },
  { roles: ["ADMIN"] }
);
