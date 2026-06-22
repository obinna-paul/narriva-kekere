import { prisma } from "@/lib/db/prisma";
import type { BlogCategory, BlogPost, BlogStatus, Prisma } from "@prisma/client";

export interface ListBlogPostsParams {
  category?: BlogCategory;
  search?: string;
  page?: number;
  pageSize?: number;
  /** Admins can see drafts too; the public site never should. */
  includeDrafts?: boolean;
}

export interface ListBlogPostsResult {
  posts: BlogPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listBlogPosts(
  params: ListBlogPostsParams = {}
): Promise<ListBlogPostsResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 6));

  const where: Prisma.BlogPostWhereInput = {
    ...(params.includeDrafts ? {} : { status: "PUBLISHED" as BlogStatus }),
    ...(params.category ? { category: params.category } : {}),
    ...(params.search
      ? {
          OR: [
            { title: { contains: params.search, mode: "insensitive" } },
            { excerpt: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    posts,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getBlogPostBySlug(
  slug: string,
  { includeDrafts = false }: { includeDrafts?: boolean } = {}
): Promise<BlogPost | null> {
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) return null;
  if (!includeDrafts && post.status !== "PUBLISHED") return null;
  return post;
}

export async function getBlogPostByIdForAdmin(id: string): Promise<BlogPost | null> {
  return prisma.blogPost.findUnique({ where: { id } });
}

export interface BlogPostInput {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImageRef?: string;
  coverColor?: string;
  category: BlogCategory;
  tags: string[];
  authorName: string;
  status: BlogStatus;
  publishedAt?: Date | null;
}

export async function createBlogPost(data: BlogPostInput): Promise<BlogPost> {
  return prisma.blogPost.create({
    data: {
      ...data,
      publishedAt: data.status === "PUBLISHED" ? data.publishedAt ?? new Date() : null,
    },
  });
}

export async function updateBlogPost(
  id: string,
  data: Partial<BlogPostInput>
): Promise<BlogPost> {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  const becomingPublished = data.status === "PUBLISHED" && existing?.status !== "PUBLISHED";

  return prisma.blogPost.update({
    where: { id },
    data: {
      ...data,
      ...(becomingPublished && !data.publishedAt ? { publishedAt: new Date() } : {}),
    },
  });
}

export async function deleteBlogPost(id: string): Promise<void> {
  await prisma.blogPost.delete({ where: { id } });
}

/** The public blog API addresses posts by slug ([slug] routes), not id. */
export async function updateBlogPostBySlug(
  slug: string,
  data: Partial<BlogPostInput>
): Promise<BlogPost> {
  const existing = await prisma.blogPost.findUnique({ where: { slug } });
  if (!existing) throw new Error("Blog post not found");
  return updateBlogPost(existing.id, data);
}

export async function deleteBlogPostBySlug(slug: string): Promise<void> {
  await prisma.blogPost.delete({ where: { slug } });
}
