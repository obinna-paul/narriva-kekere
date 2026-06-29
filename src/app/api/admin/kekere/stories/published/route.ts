import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const genre = url.searchParams.get("genre");
    const tier = url.searchParams.get("tier");
    const authorId = url.searchParams.get("authorId");
    const search = url.searchParams.get("search");
    const sort = url.searchParams.get("sort") ?? "published_date_desc";

    const where: Prisma.StoryWhereInput = { status: "PUBLISHED" };

    if (genre) where.genre = genre;
    if (tier) where.tier = tier as Prisma.EnumStoryTierFilter["equals"];
    if (authorId) where.authorId = authorId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { hookLine: { contains: search, mode: "insensitive" } },
      ];
    }

    let orderBy: Prisma.StoryOrderByWithRelationInput;
    switch (sort) {
      case "unlocks_desc":
        orderBy = { unlocks: { _count: "desc" } };
        break;
      case "unlocks_asc":
        orderBy = { unlocks: { _count: "asc" } };
        break;
      case "completion_rate_desc":
        orderBy = { completionRate: "desc" };
        break;
      default:
        orderBy = { publishedAt: "desc" };
    }

    const stories = await prisma.story.findMany({
      where,
      include: {
        _count: { select: { unlocks: true } },
        platformEarnings: { select: { cowries: true } },
      },
      orderBy,
    });

    return NextResponse.json({
      stories: stories.map((s) => ({
        id: s.id,
        title: s.title,
        tier: s.tier,
        cowrieCost: s.cowrieCost,
        publishedAt: s.publishedAt?.toISOString() ?? null,
        totalUnlocks: s._count.unlocks,
        completionRate: s.completionRate,
        totalEarnings: s.platformEarnings.reduce(
          (sum, pe) => sum + pe.cowries,
          0,
        ),
      })),
    });
  },
  { roles: ["ADMIN"] },
);
