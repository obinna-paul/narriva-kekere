export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { nextSlugForTitle } from "@/lib/data/kekere-slugs";

/**
 * One-time (idempotent — safe to re-run) backfill for stories published
 * before slugs existed. Processes oldest-published-first so the numbering
 * for repeated titles (title, title-1, title-2, ...) is stable and matches
 * the order those stories actually went live in. Each story gets its own
 * transaction so a slug collision retry never has to redo prior work.
 */
export const POST = withAuth(
  async () => {
    const stories = await prisma.story.findMany({
      where: { status: "PUBLISHED", slug: null },
      select: { id: true, title: true },
      orderBy: { publishedAt: "asc" },
    });

    const assigned: { id: string; title: string; slug: string }[] = [];
    const failed: { id: string; title: string; error: string }[] = [];

    for (const story of stories) {
      try {
        const slug = await prisma.$transaction(async (tx) => {
          const s = await nextSlugForTitle(tx, story.title);
          await tx.story.update({ where: { id: story.id }, data: { slug: s } });
          return s;
        });
        assigned.push({ id: story.id, title: story.title, slug });
      } catch (error) {
        failed.push({ id: story.id, title: story.title, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return NextResponse.json({
      success: failed.length === 0,
      totalCandidates: stories.length,
      assignedCount: assigned.length,
      assigned,
      failed,
    });
  },
  { roles: ["ADMIN"] },
);
