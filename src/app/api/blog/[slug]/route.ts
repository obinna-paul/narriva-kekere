export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession, withAuth } from "@/lib/auth/middleware";
import { isAdmin } from "@/lib/auth/roles";
import { deleteBlogPostBySlug, getBlogPostBySlug, updateBlogPostBySlug } from "@/lib/data/blog";

const CATEGORIES = [
  "WRITING_CRAFT",
  "PUBLISHING_ADVICE",
  "AUTHOR_SPOTLIGHT",
  "KEKERE_FEATURE",
  "BEHIND_THE_SCENES",
] as const;

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const session = await getCurrentSession();
  const post = await getBlogPostBySlug(params.slug, { includeDrafts: isAdmin(session) });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  return NextResponse.json({ post });
}

const updateSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  excerpt: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  featuredImageRef: z.string().optional(),
  coverColor: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  tags: z.array(z.string()).optional(),
  authorName: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  publishedAt: z.coerce.date().optional(),
});

export const PUT = withAuth(
  async (request, _session, { params }: { params: { slug: string } }) => {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const post = await updateBlogPostBySlug(params.slug, parsed.data);
    return NextResponse.json({ post });
  },
  { roles: ["ADMIN"] }
);

export const DELETE = withAuth(
  async (_request, _session, { params }: { params: { slug: string } }) => {
    await deleteBlogPostBySlug(params.slug);
    return NextResponse.json({ ok: true });
  },
  { roles: ["ADMIN"] }
);
