import { prisma } from "@/lib/db/prisma";
import type { Book, Prisma } from "@prisma/client";

export type BookWithAuthor = Book & {
  author: {
    id: string;
    name: string;
    slug: string | null;
    shortBio: string | null;
    avatarColor: string | null;
  };
};

const authorInclude = {
  author: {
    select: { id: true, name: true, slug: true, shortBio: true, avatarColor: true },
  },
} as const;

export interface ListBooksParams {
  genre?: string;
  authorSlug?: string;
  newOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListBooksResult {
  books: BookWithAuthor[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listBooks(params: ListBooksParams = {}): Promise<ListBooksResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 12));

  const where: Prisma.BookWhereInput = {
    ...(params.genre ? { genre: params.genre } : {}),
    ...(params.newOnly ? { isNewRelease: true } : {}),
    ...(params.authorSlug ? { author: { slug: params.authorSlug } } : {}),
  };

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: authorInclude,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.book.count({ where }),
  ]);

  return {
    books,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getBookBySlug(slug: string): Promise<BookWithAuthor | null> {
  return prisma.book.findUnique({ where: { slug }, include: authorInclude });
}

export async function getBookById(id: string): Promise<BookWithAuthor | null> {
  return prisma.book.findUnique({ where: { id }, include: authorInclude });
}

export async function getFeaturedBooks(limit = 6): Promise<BookWithAuthor[]> {
  const featured = await prisma.book.findMany({
    where: { featured: true },
    include: authorInclude,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  if (featured.length >= limit) return featured;

  // Backfill with the most recent non-featured books so the homepage
  // carousel still has content before an admin has flagged anything.
  const fallback = await prisma.book.findMany({
    where: { featured: false },
    include: authorInclude,
    orderBy: { publishedAt: "desc" },
    take: limit - featured.length,
  });

  return [...featured, ...fallback];
}

export async function getDistinctGenres(): Promise<string[]> {
  const rows = await prisma.book.findMany({
    distinct: ["genre"],
    select: { genre: true },
    orderBy: { genre: "asc" },
  });
  return rows.map((r) => r.genre);
}

export interface BookInput {
  slug: string;
  title: string;
  authorId: string;
  genre: string;
  hookLine: string;
  synopsis: string;
  excerpt: string[];
  coverImageRef: string;
  ebookRef: string;
  chapterCount: number;
  wordCount: number;
  estimatedReadTime: number;
  price: number;
  editorNote?: string;
  editorNoteAttribution?: string;
  featured?: boolean;
  isNewRelease?: boolean;
  publishedAt: Date;
}

export async function createBook(data: BookInput): Promise<Book> {
  return prisma.book.create({ data });
}

export async function updateBook(id: string, data: Partial<BookInput>): Promise<Book> {
  return prisma.book.update({ where: { id }, data });
}

export async function deleteBook(id: string): Promise<void> {
  await prisma.book.delete({ where: { id } });
}

export async function getBookPurchase(
  userId: string,
  bookId: string
): Promise<{ id: string; purchasedAt: Date } | null> {
  return prisma.bookPurchase.findUnique({
    where: { userId_bookId: { userId, bookId } },
    select: { id: true, purchasedAt: true },
  });
}

export async function createBookPurchase(
  userId: string,
  bookId: string,
  paymentReference: string
): Promise<{ id: string }> {
  return prisma.bookPurchase.create({
    data: { userId, bookId, paymentReference },
    select: { id: true },
  });
}

export async function getReadingProgress(
  userId: string,
  bookId: string
): Promise<{
  currentChapter: number;
  currentScrollPosition: number;
  lastReadAt: Date;
  completedChapterIds: number[];
} | null> {
  const progress = await prisma.bookReadingProgress.findUnique({
    where: { userId_bookId: { userId, bookId } },
    select: {
      currentChapter: true,
      currentScrollPosition: true,
      lastReadAt: true,
      completedChapterIds: true,
    },
  });
  return progress;
}

export async function upsertReadingProgress(
  userId: string,
  bookId: string,
  data: {
    currentChapter: number;
    currentScrollPosition: number;
    completedChapterIds: number[];
  }
): Promise<void> {
  await prisma.bookReadingProgress.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: { ...data, lastReadAt: new Date() },
    create: { userId, bookId, ...data, lastReadAt: new Date() },
  });
}

export interface PurchasedBookItem {
  id: string;
  slug: string;
  title: string;
  coverImageRef: string;
  authorName: string;
  purchasedAt: Date;
  progress: {
    currentChapter: number;
    currentScrollPosition: number;
    lastReadAt: Date;
    completedChapterIds: number[];
  } | null;
}

export async function getPurchasedBooksWithProgress(
  userId: string
): Promise<PurchasedBookItem[]> {
  const purchases = await prisma.bookPurchase.findMany({
    where: { userId },
    include: {
      book: {
        include: {
          author: { select: { name: true } },
          readingProgress: {
            where: { userId },
            select: {
              currentChapter: true,
              currentScrollPosition: true,
              lastReadAt: true,
              completedChapterIds: true,
            },
          },
        },
      },
    },
    orderBy: { purchasedAt: "desc" },
  });

  return purchases.map((p) => ({
    id: p.book.id,
    slug: p.book.slug,
    title: p.book.title,
    coverImageRef: p.book.coverImageRef,
    authorName: p.book.author.name,
    purchasedAt: p.purchasedAt,
    progress: p.book.readingProgress[0] ?? null,
  }));
}
