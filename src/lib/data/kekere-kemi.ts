import type { StoryTier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getUserCategoryScores, getTopGenre } from "@/lib/data/kekere-taste";
import { getWalletForUser } from "@/lib/data/kekere-wallet";
import { hasFreeReadAvailable } from "@/lib/data/kekere-stories";
import { resolveCategoryBySlug } from "@/content/story-tags";

const MAX_CATALOG_ENTRIES = 300;

export interface KemiCatalogEntry {
  slug: string;
  title: string;
  hookLine: string;
  genre: string;
  tags: string[];
  tier: StoryTier;
  cowrieCost: number;
  readingTime: number;
  isAdult: boolean;
  authorName: string;
  coverColor: string;
  coverImageRef: string | null;
}

/**
 * The ONLY story data Kemi's prompt ever sees — title, hookline, genre,
 * tags, tier, cost, length, author. Deliberately excludes body/plot/ending,
 * so Kemi is structurally incapable of spoiling a story: the information
 * simply never reaches the model. Capped defensively so the catalog can
 * never blow past a reasonable prompt size as the library grows.
 */
export async function getKemiCatalog(): Promise<KemiCatalogEntry[]> {
  const stories = await prisma.story.findMany({
    where: { status: "PUBLISHED", slug: { not: null } },
    select: {
      slug: true,
      title: true,
      hookLine: true,
      genre: true,
      tier: true,
      cowrieCost: true,
      readingTime: true,
      isAdult: true,
      coverColor: true,
      coverImageRef: true,
      author: { select: { name: true } },
      tags: { select: { tag: { select: { label: true } } } },
    },
    orderBy: { publishedAt: "desc" },
    take: MAX_CATALOG_ENTRIES,
  });

  return stories.map((s) => ({
    slug: s.slug!,
    title: s.title,
    hookLine: s.hookLine,
    genre: s.genre,
    tags: s.tags.map((t) => t.tag.label),
    tier: s.tier,
    cowrieCost: s.cowrieCost,
    readingTime: s.readingTime,
    isAdult: s.isAdult,
    authorName: s.author.name,
    coverColor: s.coverColor,
    coverImageRef: s.coverImageRef,
  }));
}

export function formatCatalogForPrompt(catalog: KemiCatalogEntry[]): string {
  if (catalog.length === 0) return "(No stories are published yet — tell the reader to check back soon.)";
  return catalog
    .map((s) => {
      const tagPart = s.tags.length > 0 ? `, tags: ${s.tags.join(", ")}` : "";
      const adultPart = s.isAdult ? ", 18+" : "";
      return `- [${s.slug}] "${s.title}" by ${s.authorName} — ${s.genre}${tagPart}. Hook: "${s.hookLine}". ${s.readingTime} min read, ${s.cowrieCost} cowries, ${s.tier} tier${adultPart}.`;
    })
    .join("\n");
}

export interface KemiReaderContext {
  topGenre: string | null;
  topCategoryTitles: string[];
  recentlyReadSlugs: string[];
  freeReadAvailable: boolean;
  cowrieBalance: number;
}

/** Everything Kemi is told about THIS reader — taste signal, what they've
 *  already read (so she doesn't recommend it back to them), and their
 *  cowrie situation (so she knows whether to lean on the free-read hook or
 *  just recommend). */
export async function getKemiReaderContext(userId: string): Promise<KemiReaderContext> {
  const [categoryScores, topGenre, wallet, freeReadAvailable, completions, unlocks] = await Promise.all([
    getUserCategoryScores(userId),
    getTopGenre(userId),
    getWalletForUser(userId),
    hasFreeReadAvailable(userId),
    prisma.storyCompletion.findMany({ where: { userId }, select: { story: { select: { slug: true } } } }),
    prisma.storyUnlock.findMany({ where: { userId }, select: { story: { select: { slug: true } } } }),
  ]);

  const topCategoryTitles = Array.from(categoryScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([slug]) => resolveCategoryBySlug(slug)?.title)
    .filter((title): title is string => !!title);

  const recentlyReadSlugs = Array.from(
    new Set(
      [...completions, ...unlocks]
        .map((row) => row.story.slug)
        .filter((slug): slug is string => !!slug),
    ),
  );

  return {
    topGenre,
    topCategoryTitles,
    recentlyReadSlugs,
    freeReadAvailable,
    cowrieBalance: wallet?.spendingBalance ?? 0,
  };
}

export function formatReaderContextForPrompt(ctx: KemiReaderContext): string {
  const lines: string[] = [];

  const tastePieces = [ctx.topGenre, ...ctx.topCategoryTitles].filter((p): p is string => !!p);
  lines.push(
    tastePieces.length > 0
      ? `This reader tends to gravitate toward: ${tastePieces.join("; ")}.`
      : "No reading history yet for this reader — treat them as brand new. Ask one quick question to learn their taste before recommending.",
  );

  if (ctx.recentlyReadSlugs.length > 0) {
    lines.push(
      `They've already read or unlocked these story slugs — don't recommend these again unless they explicitly ask to revisit one: ${ctx.recentlyReadSlugs.join(", ")}.`,
    );
  }

  lines.push(
    ctx.freeReadAvailable
      ? "They still have their free first read available and haven't used it yet — a great, low-pressure nudge if they haven't unlocked anything."
      : `Their cowrie balance is ${ctx.cowrieBalance}.`,
  );

  return lines.join("\n");
}
