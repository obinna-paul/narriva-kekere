/**
 * Seeds the database with the same content used as mock data in Phases 3-6,
 * so the site looks populated immediately after Phase 7's DB wiring. Safe to
 * re-run — every record is upserted by its unique key (email/slug).
 *
 * Run with `npm run db:seed` (or `npx prisma db seed`) once DATABASE_URL
 * points at a real, reachable Postgres instance.
 */
import { PrismaClient, type BlogCategory, type StoryTier } from "@prisma/client";
import bcrypt from "bcryptjs";
import { MOCK_AUTHORS, MOCK_BOOKS } from "../src/content/mock/narriva-home";
import { MOCK_BLOG_POSTS } from "../src/content/mock/narriva-blog";
import { SERVICES } from "../src/content/mock/narriva-services";
import { MOCK_STORIES } from "../src/content/mock/kekere-stories";
import { MOCK_COMPETITIONS } from "../src/content/mock/kekere-competitions";

const prisma = new PrismaClient();

const SEED_AUTHOR_PASSWORD = "Narriva-Seed-2026!";

const CATEGORY_FROM_LABEL: Record<string, BlogCategory> = {
  "Writing Craft": "WRITING_CRAFT",
  "Publishing Advice": "PUBLISHING_ADVICE",
  "Author Spotlight": "AUTHOR_SPOTLIGHT",
  "Behind the Scenes": "BEHIND_THE_SCENES",
};

// First N books become "featured" for the homepage carousel — the original
// mock data didn't track this distinction, so we make the same editorial
// call the Phase 3 homepage did (show the most recent handful).
const FEATURED_COUNT = 6;

async function seedAuthors() {
  const passwordHash = await bcrypt.hash(SEED_AUTHOR_PASSWORD, 10);
  const authorIdBySlug = new Map<string, string>();

  for (const author of MOCK_AUTHORS) {
    const user = await prisma.user.upsert({
      where: { email: `${author.slug}@narriva.seed` },
      update: {
        name: author.name,
        slug: author.slug,
        shortBio: author.description,
        bio: author.bio.join("\n\n"),
        avatarColor: author.avatarColor,
        socialLinks: author.socialLinks ?? undefined,
      },
      create: {
        email: `${author.slug}@narriva.seed`,
        name: author.name,
        password: passwordHash,
        role: "WRITER",
        slug: author.slug,
        shortBio: author.description,
        bio: author.bio.join("\n\n"),
        avatarColor: author.avatarColor,
        socialLinks: author.socialLinks ?? undefined,
      },
    });
    authorIdBySlug.set(author.slug, user.id);
  }

  return authorIdBySlug;
}

async function seedBooks(authorIdBySlug: Map<string, string>) {
  for (let index = 0; index < MOCK_BOOKS.length; index++) {
    const book = MOCK_BOOKS[index];
    const authorId = authorIdBySlug.get(book.authorSlug);
    if (!authorId) {
      console.warn(`Skipping "${book.title}" — no seeded author for ${book.authorSlug}`);
      continue;
    }

    await prisma.book.upsert({
      where: { slug: book.slug },
      update: {
        title: book.title,
        authorId,
        genre: book.genre,
        hookLine: book.hookLine,
        synopsis: book.synopsis,
        excerpt: [...book.excerpt],
        coverImageRef: book.coverColor,
        ebookRef: book.ebookRef,
        chapterCount: book.chapterCount,
        wordCount: book.wordCount,
        estimatedReadTime: book.estimatedReadTime,
        price: book.priceNgn,
        editorNote: book.editorNote.text,
        editorNoteAttribution: book.editorNote.editor,
        featured: index < FEATURED_COUNT,
        isNewRelease: book.isNewRelease,
      },
      create: {
        slug: book.slug,
        title: book.title,
        authorId,
        genre: book.genre,
        hookLine: book.hookLine,
        synopsis: book.synopsis,
        excerpt: [...book.excerpt],
        coverImageRef: book.coverColor,
        ebookRef: book.ebookRef,
        chapterCount: book.chapterCount,
        wordCount: book.wordCount,
        estimatedReadTime: book.estimatedReadTime,
        price: book.priceNgn,
        editorNote: book.editorNote.text,
        editorNoteAttribution: book.editorNote.editor,
        featured: index < FEATURED_COUNT,
        isNewRelease: book.isNewRelease,
        // Spread publish dates out so "most recent" sorting looks realistic.
        publishedAt: new Date(Date.now() - index * 1000 * 60 * 60 * 24 * 21),
      },
    });
  }
}

async function seedBlogPosts() {
  for (const post of MOCK_BLOG_POSTS) {
    const category = CATEGORY_FROM_LABEL[post.category];
    const content = post.content.join("\n\n");

    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content,
        coverColor: post.coverColor,
        category,
        authorName: post.authorName,
        status: "PUBLISHED",
        publishedAt: new Date(post.date),
      },
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content,
        coverColor: post.coverColor,
        category,
        tags: [],
        authorName: post.authorName,
        status: "PUBLISHED",
        publishedAt: new Date(post.date),
      },
    });
  }
}

async function seedServices() {
  for (let index = 0; index < SERVICES.length; index++) {
    const service = SERVICES[index];
    const content = {
      opening: service.opening,
      included: service.included,
      closing: service.closing,
      costClarity: service.costClarity,
      faqs: service.faqs,
    };

    await prisma.service.upsert({
      where: { slug: service.slug },
      update: { title: service.name, content: content as object, order: index },
      create: { slug: service.slug, title: service.name, content: content as object, order: index },
    });
  }
}

// Each mock story's authorId (e.g. "amaka-briggs") is used directly as the
// real User's id — same trick for Story ids below — so nothing needs a
// separate id-mapping pass the way seedAuthors()/seedBooks() needed one for
// Narriva (those used real cuids from the start).
async function seedKekereAuthors() {
  const passwordHash = await bcrypt.hash(SEED_AUTHOR_PASSWORD, 10);
  const seen = new Set<string>();

  for (const story of MOCK_STORIES) {
    if (seen.has(story.authorId)) continue;
    seen.add(story.authorId);

    await prisma.user.upsert({
      where: { id: story.authorId },
      update: { name: story.authorName, role: "WRITER" },
      create: {
        id: story.authorId,
        email: `${story.authorId}@kekere.seed`,
        name: story.authorName,
        password: passwordHash,
        role: "WRITER",
        avatarColor: story.coverColor,
        wallet: { create: { balance: 0 } },
      },
    });
  }
}

async function seedKekereStories() {
  for (const story of MOCK_STORIES) {
    const tier = story.tier.toUpperCase() as StoryTier;
    const body = story.paragraphs.join("\n\n");
    const publishedAt = new Date(story.publishedAt);

    await prisma.story.upsert({
      where: { id: story.id },
      update: {
        title: story.title,
        authorId: story.authorId,
        hookLine: story.hookLine,
        body,
        genre: story.genre,
        coverColor: story.coverColor,
        status: "PUBLISHED",
        tier,
        cowrieCost: story.cowrieCost,
        readingTime: story.readingTimeMinutes,
        completionRate: story.completionRate,
        publishedAt,
        submittedAt: publishedAt,
      },
      create: {
        id: story.id,
        title: story.title,
        authorId: story.authorId,
        hookLine: story.hookLine,
        body,
        genre: story.genre,
        coverColor: story.coverColor,
        status: "PUBLISHED",
        tier,
        cowrieCost: story.cowrieCost,
        readingTime: story.readingTimeMinutes,
        completionRate: story.completionRate,
        publishedAt,
        submittedAt: publishedAt,
      },
    });
  }
}

async function seedCompetitions() {
  for (const comp of MOCK_COMPETITIONS) {
    const hasWinners = !!comp.pastWinners?.length;
    // The real backend (Phase 13) only surfaces winners once status is
    // COMPLETE — the Phase 10 mock used CLOSED for past competitions with
    // winners, which would now hide them. Correcting it here so the seeded
    // data actually demonstrates the feature instead of reproducing a
    // mismatch between the old mock semantics and the real gating rule.
    const status = hasWinners ? "COMPLETE" : comp.status;

    const competition = await prisma.competition.upsert({
      where: { slug: comp.slug },
      update: {
        title: comp.title,
        theme: comp.theme,
        themeDescription: comp.themeDescription,
        deadline: new Date(comp.deadline),
        prizeDescription: comp.prizeDescription,
        wordCountLimit: comp.wordCountLimit,
        status,
      },
      create: {
        slug: comp.slug,
        title: comp.title,
        theme: comp.theme,
        themeDescription: comp.themeDescription,
        deadline: new Date(comp.deadline),
        prizeDescription: comp.prizeDescription,
        wordCountLimit: comp.wordCountLimit,
        status,
      },
    });

    if (!comp.pastWinners) continue;

    for (let i = 0; i < comp.pastWinners.length; i++) {
      const winner = comp.pastWinners[i];
      // winner.storyId matches a seeded Story id directly, since Story ids
      // were set explicitly to the mock story ids above.
      await prisma.competitionEntry.upsert({
        where: {
          competitionId_storyId: { competitionId: competition.id, storyId: winner.storyId },
        },
        update: { placement: i + 1 },
        create: { competitionId: competition.id, storyId: winner.storyId, placement: i + 1 },
      });
    }
  }
}

async function main() {
  console.log("Seeding authors…");
  const authorIdBySlug = await seedAuthors();

  console.log("Seeding books…");
  await seedBooks(authorIdBySlug);

  console.log("Seeding blog posts…");
  await seedBlogPosts();

  console.log("Seeding services…");
  await seedServices();

  console.log("Seeding Kekere authors…");
  await seedKekereAuthors();

  console.log("Seeding Kekere stories…");
  await seedKekereStories();

  console.log("Seeding Kekere competitions…");
  await seedCompetitions();

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
