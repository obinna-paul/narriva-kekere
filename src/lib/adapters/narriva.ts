/**
 * Maps real Prisma rows onto the same shapes the Phase 3/4/6 presentational
 * components (BookCard, AuthorCard, BlogCard, etc.) were built against, so
 * none of those components needed to change when Phase 7 swapped mock arrays
 * for database queries — only the data boundary changed.
 */
import type { BookWithAuthor } from "@/lib/data/books";
import type { AuthorSummary, AuthorWithBooks } from "@/lib/data/authors";
import type { ServiceWithContent } from "@/lib/data/services";
import type { BlogPost as DbBlogPost } from "@prisma/client";
import type { MockAuthor, MockBook } from "@/content/mock/narriva-home";
import type { MockBlogPost } from "@/content/mock/narriva-blog";
import type { ServiceContent } from "@/content/mock/narriva-services";

const CATEGORY_LABEL: Record<DbBlogPost["category"], MockBlogPost["category"]> = {
  WRITING_CRAFT: "Writing Craft",
  PUBLISHING_ADVICE: "Publishing Advice",
  AUTHOR_SPOTLIGHT: "Author Spotlight",
  KEKERE_FEATURE: "Behind the Scenes",
  BEHIND_THE_SCENES: "Behind the Scenes",
};

export function toBookCardData(book: BookWithAuthor): MockBook {
  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    authorSlug: book.author.slug ?? book.author.id,
    author: book.author.name,
    genre: book.genre,
    isNewRelease: book.isNewRelease,
    hookLine: book.hookLine,
    synopsis: book.synopsis,
    excerpt: book.excerpt,
    priceNgn: book.price,
    coverColor: book.coverImageRef,
    ebookRef: book.ebookRef,
    chapterCount: book.chapterCount,
    wordCount: book.wordCount,
    estimatedReadTime: book.estimatedReadTime,
    editorNote: {
      text: book.editorNote ?? "",
      editor: book.editorNoteAttribution ?? "",
    },
  };
}

type AuthorCardSource = Pick<AuthorSummary, "id" | "slug" | "name" | "shortBio" | "avatarColor"> &
  Partial<Pick<AuthorSummary, "bio" | "socialLinks">>;

export function toAuthorCardData(author: AuthorCardSource): MockAuthor {
  return {
    slug: author.slug ?? author.id,
    name: author.name,
    description: author.shortBio ?? "",
    bio: (author.bio ?? "").split("\n\n").filter(Boolean),
    avatarColor: author.avatarColor ?? "#1E3A8A",
    socialLinks: (author.socialLinks as { label: string; href: string }[] | null) ?? undefined,
  };
}

export function toAuthorDetailData(
  author: AuthorWithBooks
): MockAuthor & { books: MockBook[] } {
  return {
    ...toAuthorCardData(author),
    books: author.books.map((book) =>
      toBookCardData({
        ...book,
        author: {
          id: author.id,
          name: author.name,
          slug: author.slug,
          shortBio: author.shortBio,
          avatarColor: author.avatarColor,
        },
      })
    ),
  };
}

export function toBlogCardData(post: DbBlogPost): MockBlogPost {
  return {
    slug: post.slug,
    title: post.title,
    category: CATEGORY_LABEL[post.category],
    date: (post.publishedAt ?? post.createdAt).toISOString(),
    authorName: post.authorName,
    excerpt: post.excerpt,
    coverColor: post.coverColor,
    content: post.content.split("\n\n").filter(Boolean),
  };
}

export function toServiceContent(service: ServiceWithContent): ServiceContent {
  return {
    slug: service.slug,
    name: service.title,
    // Falls back gracefully for any Service row saved before this field
    // existed — content is a free-form JSON blob, not a migrated column.
    tagline: service.content.tagline ?? "",
    opening: service.content.opening,
    included: service.content.included,
    closing: service.content.closing,
    costClarity: service.content.costClarity,
    faqs: service.content.faqs,
  };
}
