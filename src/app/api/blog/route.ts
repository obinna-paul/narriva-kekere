export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import type { BlogCategory } from "@prisma/client";
import { withAuth } from "@/lib/auth/middleware";
import { createBlogPost, listBlogPosts } from "@/lib/data/blog";

const CATEGORIES = [
  "WRITING_CRAFT",
  "PUBLISHING_ADVICE",
  "AUTHOR_SPOTLIGHT",
  "KEKERE_FEATURE",
  "BEHIND_THE_SCENES",
] as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = (url.searchParams.get("category") as BlogCategory | null) ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "6");

  const result = await listBlogPosts({ category, search, page, pageSize });
  return NextResponse.json(result);
}

const blogPostSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  content: z.string().min(1),
  featuredImageRef: z.string().optional(),
  coverColor: z.string().optional(),
  category: z.enum(CATEGORIES),
  tags: z.array(z.string()).default([]),
  authorName: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  publishedAt: z.coerce.date().optional(),
});

export const POST = withAuth(
  async (request) => {
    const body = await request.json();
    const parsed = blogPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const post = await createBlogPost(parsed.data);
    return NextResponse.json({ post }, { status: 201 });
  },
  { roles: ["ADMIN"] }
);
