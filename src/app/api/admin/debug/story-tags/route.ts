export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async (request, _session, { params }) => {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title");

    if (!title) {
      return NextResponse.json({ error: "title parameter required" }, { status: 400 });
    }

    const story = await prisma.story.findFirst({
      where: { title },
      select: {
        id: true,
        title: true,
        status: true,
        tags: {
          select: {
            tag: {
              select: { id: true, slug: true, label: true },
            },
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: story.id,
      title: story.title,
      status: story.status,
      tags: story.tags.map((st) => ({
        id: st.tag.id,
        slug: st.tag.slug,
        label: st.tag.label,
      })),
    });
  },
  { roles: ["ADMIN"] }
);
