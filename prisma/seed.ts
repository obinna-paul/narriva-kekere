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
      tagline: service.tagline,
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
        wallet: { create: { spendingBalance: 0 } },
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
      // Stories are now real DB records — skip if the referenced story doesn't exist yet.
      const storyExists = await prisma.story.findUnique({
        where: { id: winner.storyId },
        select: { id: true },
      });
      if (!storyExists) {
        console.log(`  Skipping winner entry — story "${winner.storyId}" not in DB yet`);
        continue;
      }
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

const FEATURE_FLAGS = [
  { key: "cowrie_withdrawals", enabled: true, description: "Allows writers to request cowrie withdrawals" },
  { key: "story_submissions", enabled: true, description: "Allows writers to submit stories for review" },
  { key: "manuscript_submissions", enabled: true, description: "Allows authors to submit manuscripts to Narriva" },
  { key: "referral_program", enabled: true, description: "Enables referral codes and rewards" },
];

const PLATFORM_SETTINGS = [
  { key: "monthly_revenue_target_ngn", value: "500000" },
  { key: "writer_earnings_rate", value: "0.70" },
  { key: "referral_reward_cowries", value: "3" },
  { key: "completion_bonus_cowries", value: "1" },
  { key: "tip_amount_cowries", value: "1" },
  { key: "withdrawal_rate_ngn_per_cowrie", value: "50" },
];

async function seedPlatformConfig() {
  for (const flag of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    });
  }

  for (const setting of PLATFORM_SETTINGS) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
}

const PUBLISHING_CONTRACT_TEMPLATE = `KEKERE PUBLISHING CONTRACT

This publishing agreement ("Agreement") is entered into as of {{date}}, between Narriva Limited ("Publisher") and {{writer_name}} ("Writer").

STORY DETAILS
Title: {{story_title}}
Genre: {{genre}}
Agreed Cowrie Price: {{cowrie_cost}} cowries

────────────────────────────────────────

1. GRANT OF PUBLISHING RIGHTS

The Writer grants the Publisher the exclusive right to officially publish and distribute the Story on the Kekere platform (narriva.pro/kekere) for the duration of this Agreement. The Writer retains full copyright ownership of the Story.

The Writer agrees not to make this Story available for free on any other platform, website, app, or medium while this Agreement is in force. The Writer may, however, publish and sell this Story as a paid work on other platforms, provided the price on those platforms is equal to or greater than the agreed cowrie price on Kekere.

2. WRITER'S EARNINGS

The Writer shall receive seventy percent (70%) of all revenue generated from purchases of this Story on the Kekere platform. Revenue is calculated in cowries, Kekere's digital currency.

Exchange rate: As of the date of this Agreement, 1 cowrie = ₦50 (fifty naira). This rate is subject to change at the Publisher's discretion; Writers will be notified 30 days in advance of any change.

Earnings accumulate in real time in the Writer's cowrie wallet and may be withdrawn at any time via the platform withdrawal feature, subject to minimum withdrawal thresholds and Paystack transfer availability.

3. ORIGINALITY AND INTELLECTUAL PROPERTY

The Writer warrants that:
- The Story is wholly original and the Writer's own creative work.
- The Writer is the sole author and the lawful owner of all intellectual property rights in the Story.
- The Story does not infringe the copyright, trademark, or any other rights of any third party.
- The Story does not contain defamatory, obscene, or otherwise unlawful content.
- If the Story has been published elsewhere as a paid work, the Writer has disclosed this to the Publisher prior to signing.

The Writer retains full copyright ownership of the Story. This Agreement grants the Publisher a licence to officially publish; it is not a transfer of copyright.

4. EXCLUSIVITY TERMS

Kekere is the exclusive official publisher of this Story. To protect this investment, the Writer agrees that:

- The Story may NOT be distributed or made available for free on any other platform, website, app, or service.
- The Story MAY be sold as a paid work on other platforms (e.g. Amazon KDP, Selar, Gumroad), provided the listing price on those platforms is not lower than the agreed cowrie price in this Agreement.

Making this Story freely available elsewhere during the term of this Agreement constitutes a material breach. In the event of breach, the Publisher reserves the right to immediately remove the Story from the platform, withhold unpaid earnings pending investigation, and terminate this Agreement without liability.

5. CONTENT STANDARDS

The Story must comply with Kekere's content guidelines at all times. The Publisher reserves the right to remove any Story that violates these guidelines with immediate effect and without liability, following reasonable written notice to the Writer where circumstances permit.

6. TERM AND TERMINATION

This Agreement is effective from the date the Writer signs below and remains in force until either party terminates it with thirty (30) days' written notice. On termination, all pending earnings due to the Writer will be paid within 14 days. The Writer's right to withdraw previously accumulated cowries is not affected by termination.

7. PLATFORM CHANGES

The Publisher may update platform features, pricing mechanisms, and exchange rates from time to time. Writers will be notified of material changes to this Agreement and may terminate within 14 days of notice if they do not accept the updated terms.

8. LIMITATION OF LIABILITY

The Publisher's total liability to the Writer under this Agreement shall not exceed the total cowrie earnings paid to the Writer in the 12 months preceding the claim.

9. GOVERNING LAW AND DISPUTES

This Agreement is governed by the laws of the Federal Republic of Nigeria. Any disputes shall first be submitted to good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration in Lagos, Nigeria, under applicable Nigerian arbitration rules.

────────────────────────────────────────

By clicking "Accept & Sign" or signing below, the Writer confirms they have read, understood, and agreed to all the terms of this Agreement.

Story: {{story_title}}
Writer: {{writer_name}}
Date: {{date}}`;

async function seedPublishingContractTemplate() {
  await prisma.kekereContractTemplate.upsert({
    where: { id: "publishing-contract-v1" },
    update: {
      name: "Standard Publishing Contract",
      contractType: "PUBLISHING",
      body: PUBLISHING_CONTRACT_TEMPLATE,
      variables: ["story_title", "writer_name", "cowrie_cost", "genre", "date"],
    },
    create: {
      id: "publishing-contract-v1",
      name: "Standard Publishing Contract",
      contractType: "PUBLISHING",
      body: PUBLISHING_CONTRACT_TEMPLATE,
      variables: ["story_title", "writer_name", "cowrie_cost", "genre", "date"],
    },
  });
}

async function seedAdminUser() {
  const passwordHash = await bcrypt.hash("admin123!", 10);
  await prisma.user.upsert({
    where: { email: "admin@narriva.com" },
    update: { role: "ADMIN", emailVerified: new Date() },
    create: {
      email: "admin@narriva.com",
      name: "Admin",
      password: passwordHash,
      role: "ADMIN",
      emailVerified: new Date(),
      wallet: { create: {} },
      termsAcceptedAt: new Date(),
    },
  });
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

  console.log("Seeding feature flags and platform settings…");
  await seedPlatformConfig();

  console.log("Seeding admin user…");
  await seedAdminUser();

  console.log("Seeding publishing contract template…");
  await seedPublishingContractTemplate();

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
