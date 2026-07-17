export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { Prisma, StoryStatus } from "@prisma/client";

const PAGE_SIZE = 30;

// Every story regardless of status/author, for the admin "All Stories"
// library — the general access point for going back into a story that's
// already pending, already published, or anywhere else in its lifecycle.
export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() ?? "";
    const status = url.searchParams.get("status") as StoryStatus | null;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));

    const where: Prisma.StoryWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { author: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [stories, total] = await Promise.all([
      prisma.story.findMany({
        where,
        select: {
          id: true,
          title: true,
          status: true,
          tier: true,
          coverImageRef: true,
          updatedAt: true,
          author: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.story.count({ where }),
    ]);

    return NextResponse.json({
      stories: stories.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        tier: s.tier,
        hasCover: !!s.coverImageRef,
        updatedAt: s.updatedAt,
        authorName: s.author.name,
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  },
  { roles: ["ADMIN"] },
);
