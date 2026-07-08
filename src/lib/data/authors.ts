import bcrypt from "bcryptjs";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import type { Book, User } from "@prisma/client";

export type AuthorSummary = Pick<
  User,
  "id" | "slug" | "name" | "shortBio" | "bio" | "avatarColor" | "socialLinks" | "avatar"
>;

export type AuthorWithBooks = AuthorSummary & { books: Book[] };

const authorSummarySelect = {
  id: true,
  slug: true,
  name: true,
  shortBio: true,
  bio: true,
  avatarColor: true,
  socialLinks: true,
  avatar: true,
} as const;

/**
 * "Authors" are Users with the WRITER role — there's no separate Author
 * model, and the same WRITER role is shared with Kekere story writers (one
 * auth system, two brands). Public Narriva author listings need
 * `withBooksOnly: true` so a writer who has only ever published Kekere
 * stories doesn't show up as a Narriva "author" with an empty page — admin
 * screens (picking an author for a new book, managing writer records) want
 * every writer regardless, so the filter defaults off.
 */
export async function listAuthors({ withBooksOnly = false }: { withBooksOnly?: boolean } = {}): Promise<
  AuthorSummary[]
> {
  return prisma.user.findMany({
    where: { role: "WRITER", ...(withBooksOnly ? { books: { some: {} } } : {}) },
    select: authorSummarySelect,
    orderBy: { name: "asc" },
  });
}

// Wrapped in React's cache() so generateMetadata and the page component
// (both of which need the same author) dedupe to a single pair of queries
// per request.
export const getAuthorBySlug = cache(async (slug: string): Promise<AuthorWithBooks | null> => {
  const author = await prisma.user.findFirst({
    where: { slug, role: "WRITER" },
    select: authorSummarySelect,
  });
  if (!author) return null;

  const books = await prisma.book.findMany({
    where: { authorId: author.id },
    orderBy: { publishedAt: "desc" },
  });

  return { ...author, books };
});

export async function getAuthorById(id: string): Promise<AuthorSummary | null> {
  return prisma.user.findUnique({ where: { id }, select: authorSummarySelect });
}

export interface CreateAuthorInput {
  name: string;
  email: string;
  password: string;
  slug: string;
  shortBio?: string;
  bio?: string;
  avatarColor?: string;
  socialLinks?: { label: string; href: string }[];
}

export async function createAuthor(data: CreateAuthorInput) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: passwordHash,
      role: "WRITER",
      slug: data.slug,
      shortBio: data.shortBio,
      bio: data.bio,
      avatarColor: data.avatarColor,
      socialLinks: data.socialLinks,
    },
  });
}

export interface UpdateAuthorInput {
  name?: string;
  slug?: string;
  shortBio?: string;
  bio?: string;
  avatarColor?: string;
  socialLinks?: { label: string; href: string }[];
}

export async function updateAuthor(id: string, data: UpdateAuthorInput) {
  return prisma.user.update({ where: { id }, data });
}

export async function deleteAuthor(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}
