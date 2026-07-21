import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { SITE_URL } from "@/content/decisions";
import { listBooks } from "@/lib/data/books";
import { listAuthors } from "@/lib/data/authors";
import { listBlogPosts } from "@/lib/data/blog";

export const dynamic = "force-dynamic";

const NARRIVA_STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/about", priority: 0.8 },
  { path: "/authors", priority: 0.7 },
  { path: "/blog", priority: 0.8 },
  { path: "/books", priority: 0.9 },
  { path: "/contact", priority: 0.5 },
  { path: "/how-we-work-together", priority: 0.6 },
  { path: "/services/editorial", priority: 0.6 },
  { path: "/services/ghostwriting", priority: 0.6 },
  { path: "/services/design", priority: 0.6 },
  { path: "/services/publishing", priority: 0.6 },
  { path: "/services/author-growth", priority: 0.6 },
  { path: "/submit", priority: 0.7 },
  { path: "/help", priority: 0.4 },
  { path: "/publishing-agreement-info", priority: 0.3 },
  { path: "/terms", priority: 0.2 },
  { path: "/privacy", priority: 0.2 },
  { path: "/refunds", priority: 0.2 },
  { path: "/copyright", priority: 0.2 },
];

const KEKERE_STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: "/kekere", priority: 1 },
  { path: "/kekere/feed", priority: 0.9 },
  { path: "/kekere/competitions", priority: 0.6 },
  { path: "/kekere/help", priority: 0.4 },
  { path: "/kekere/terms", priority: 0.2 },
  { path: "/kekere/privacy", priority: 0.2 },
  { path: "/kekere/refunds", priority: 0.2 },
  { path: "/kekere/copyright", priority: 0.2 },
];

/** listBooks/listBlogPosts cap pageSize at 50 — loop rather than assume a
 * single page covers everything, so the sitemap never silently truncates
 * as content grows past that page size. */
async function fetchAllBooks() {
  const all = [];
  let page = 1;
  while (true) {
    const { books, totalPages } = await listBooks({ page, pageSize: 50, sort: "newest" });
    all.push(...books);
    if (page >= totalPages) break;
    page += 1;
  }
  return all;
}

async function fetchAllBlogPosts() {
  const all = [];
  let page = 1;
  while (true) {
    const { posts, totalPages } = await listBlogPosts({ page, pageSize: 50 });
    all.push(...posts);
    if (page >= totalPages) break;
    page += 1;
  }
  return all;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, authors, posts, stories] = await Promise.all([
    fetchAllBooks(),
    listAuthors({ withBooksOnly: true }),
    fetchAllBlogPosts(),
    prisma.story.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, updatedAt: true },
    }),
  ]);

  return [
    ...NARRIVA_STATIC_ROUTES.map(({ path, priority }) => ({
      url: `${SITE_URL}${path}`,
      priority,
    })),
    ...KEKERE_STATIC_ROUTES.map(({ path, priority }) => ({
      url: `${SITE_URL}${path}`,
      priority,
    })),
    ...books.map((book) => ({
      url: `${SITE_URL}/books/${book.slug}`,
      lastModified: book.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...authors
      .filter((author): author is typeof author & { slug: string } => !!author.slug)
      .map((author) => ({
        url: `${SITE_URL}/authors/${author.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...stories.map((story) => ({
      url: `${SITE_URL}/kekere/story/${story.slug ?? story.id}`,
      lastModified: story.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
