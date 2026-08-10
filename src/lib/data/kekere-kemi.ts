import type { StoryTier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getUserCategoryScores, getTopGenre } from "@/lib/data/kekere-taste";
import { getWalletForUser } from "@/lib/data/kekere-wallet";
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

/** StoryTier is internal admin vocabulary — readers never see the words
 *  "Standard", "Featured" or "Champion" anywhere in the app, so Kemi must
 *  never say them either. What a reader actually recognises is the shelf a
 *  story sits on: Champion stories are the ones in the Winners' Circle
 *  (competition winners and shortlisted work), Featured ones are the
 *  editor's picks. Translated here, at the point the catalog is written
 *  into her prompt, so the internal name never reaches the model at all
 *  rather than relying on an instruction not to repeat it. */
function readerFacingTier(tier: KemiCatalogEntry["tier"]): string {
  if (tier === "CHAMPION") return ", a winning story — it won or was shortlisted in a Kekere competition";
  if (tier === "FEATURED") return ", an editor's pick";
  return "";
}

export function formatCatalogForPrompt(catalog: KemiCatalogEntry[]): string {
  if (catalog.length === 0) return "(No stories are published yet — tell the reader to check back soon.)";
  return catalog
    .map((s) => {
      const tagPart = s.tags.length > 0 ? `, tags: ${s.tags.join(", ")}` : "";
      const adultPart = s.isAdult ? ", 18+" : "";
      return `- [${s.slug}] "${s.title}" by ${s.authorName} — ${s.genre}${tagPart}. Hook: "${s.hookLine}". ${s.readingTime} min read, ${s.cowrieCost} cowries${readerFacingTier(s.tier)}${adultPart}.`;
    })
    .join("\n");
}

/** Writers with something published, and the bio they wrote themselves.
 *  Separate from the catalog rather than repeated on every story line: a bio
 *  duplicated across an author's whole backlist would cost real prompt space
 *  for no extra information, and the catalog already names the author of each
 *  story, which is what lets Kemi answer "what else has she written". */
export interface KemiWriter {
  name: string;
  bio: string | null;
}

const MAX_BIO_CHARS = 240;

export async function getKemiWriters(): Promise<KemiWriter[]> {
  const writers = await prisma.user.findMany({
    where: { stories: { some: { status: "PUBLISHED", slug: { not: null } } } },
    select: { name: true, bio: true },
    orderBy: { name: "asc" },
  });

  return writers.map((w) => {
    const bio = (w.bio ?? "").trim();
    return {
      name: w.name,
      bio: bio ? (bio.length > MAX_BIO_CHARS ? `${bio.slice(0, MAX_BIO_CHARS).trimEnd()}…` : bio) : null,
    };
  });
}

export function formatWritersForPrompt(writers: KemiWriter[]): string {
  const withBio = writers.filter((w) => w.bio);
  if (withBio.length === 0) {
    return "(No writer bios available — if asked about a writer, say you only know their stories, not their story.)";
  }
  return withBio.map((w) => `- ${w.name}: ${w.bio}`).join("\n");
}

/** Competitions a reader can actually act on right now. Kekere runs these
 *  already; Kemi simply had no idea they existed, so the one feature with a
 *  deadline attached was the one she could never mention. */
export interface KemiCompetition {
  title: string;
  theme: string;
  slug: string;
  deadline: Date;
  status: "OPEN" | "UPCOMING";
  prizeDescription: string;
}

export async function getKemiCompetitions(): Promise<KemiCompetition[]> {
  const rows = await prisma.competition.findMany({
    where: { status: { in: ["OPEN", "UPCOMING"] } },
    select: { title: true, theme: true, slug: true, deadline: true, status: true, prizeDescription: true },
    orderBy: { deadline: "asc" },
    take: 5,
  });
  return rows.map((r) => ({
    title: r.title,
    theme: r.theme,
    slug: r.slug,
    deadline: r.deadline,
    status: r.status as "OPEN" | "UPCOMING",
    prizeDescription: r.prizeDescription,
  }));
}

export function formatCompetitionsForPrompt(competitions: KemiCompetition[]): string {
  if (competitions.length === 0) {
    return "(Nothing running right now. Don't bring competitions up at all — there's nothing to point at.)";
  }
  return competitions
    .map((c) => {
      const when = c.deadline.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const state = c.status === "OPEN" ? `open now, entries close ${when}` : `not open yet, opens toward ${when}`;
      return `- "${c.title}" — theme: ${c.theme}. Prize: ${c.prizeDescription}. ${state}. Reader can find it at /kekere/competitions/${c.slug}.`;
    })
    .join("\n");
}

/** Most recently announced results — Kemi previously had no idea a
 *  competition had ever finished, so "who won?" was a question she could
 *  never actually answer even once results were live on the public
 *  Winners' Circle. Deliberately scoped to the single most recent COMPLETE
 *  competition (not the all-time Winner's Circle list, which also mixes in
 *  standalone CHAMPION-tier stories with no competition attached) — this is
 *  specifically for "who won the last competition"-shaped questions. */
export interface KemiCompetitionWinner {
  competitionTitle: string;
  placement: number;
  storyTitle: string;
  authorName: string;
}

export async function getKemiRecentWinners(): Promise<KemiCompetitionWinner[]> {
  const recentCompetition = await prisma.competition.findFirst({
    where: { status: "COMPLETE" },
    orderBy: { deadline: "desc" },
    select: { id: true, title: true },
  });
  if (!recentCompetition) return [];

  const entries = await prisma.competitionEntry.findMany({
    where: { competitionId: recentCompetition.id, placement: { not: null } },
    orderBy: { placement: "asc" },
    select: {
      placement: true,
      story: { select: { title: true, author: { select: { name: true } } } },
    },
  });

  return entries.map((e) => ({
    competitionTitle: recentCompetition.title,
    placement: e.placement!,
    storyTitle: e.story.title,
    authorName: e.story.author.name,
  }));
}

const PLACEMENT_LABELS: Record<number, string> = { 1: "1st place", 2: "2nd place", 3: "3rd place", 4: "4th place" };

export function formatWinnersForPrompt(winners: KemiCompetitionWinner[]): string {
  if (winners.length === 0) {
    return "(No competition has announced results yet. If asked who won, say results haven't been announced.)";
  }
  const lines = winners.map((w) => `- ${PLACEMENT_LABELS[w.placement] ?? `${w.placement}th place`}: "${w.storyTitle}" by ${w.authorName}`);
  return `Winners of "${winners[0].competitionTitle}":\n${lines.join("\n")}`;
}

/** A story this reader started and hasn't finished — the one thing Kemi can
 *  usefully re-orient them on. */
export interface KemiInProgressStory {
  slug: string;
  title: string;
  percent: number;
}

export interface KemiReaderContext {
  topGenre: string | null;
  topCategoryTitles: string[];
  recentlyReadSlugs: string[];
  cowrieBalance: number;
  inProgress: KemiInProgressStory | null;
}

/** Everything Kemi is told about THIS reader — taste signal, what they've
 *  already read (so she doesn't recommend it back to them), and their
 *  cowrie balance (so she knows how much runway they have to spend). */
export async function getKemiReaderContext(userId: string): Promise<KemiReaderContext> {
  const [categoryScores, topGenre, wallet, completions, unlocks, progressRows] =
    await Promise.all([
      getUserCategoryScores(userId),
      getTopGenre(userId),
      getWalletForUser(userId),
      // Capped + newest-first: the only use of these slugs is "don't
      // re-recommend what they've already read", and a reader with a big
      // backlog would otherwise stuff hundreds of slugs into every single
      // prompt — the heaviest Kemi users paying the most tokens and hitting
      // the rate limit first. The most recent 80 (trimmed to 40 below) is far
      // more than enough for that instruction.
      prisma.storyCompletion.findMany({ where: { userId }, orderBy: { completedAt: "desc" }, take: 80, select: { storyId: true, completedAt: true, story: { select: { slug: true } } } }),
      prisma.storyUnlock.findMany({ where: { userId }, orderBy: { unlockedAt: "desc" }, take: 80, select: { unlockedAt: true, story: { select: { slug: true } } } }),
      // Genuinely mid-read only: barely-started (a stray tap) and
      // all-but-finished both make a "where you left off" offer feel wrong.
      prisma.storyReadingProgress.findMany({
        where: { userId, scrollFraction: { gt: 0.05, lt: 0.95 } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { storyId: true, scrollFraction: true, story: { select: { slug: true, title: true, status: true } } },
      }),
    ]);

  const topCategoryTitles = Array.from(categoryScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([slug]) => resolveCategoryBySlug(slug)?.title)
    .filter((title): title is string => !!title);

  // Merge completions + unlocks newest-first, dedupe by slug (keeping the most
  // recent mention), and cap the list — it exists only to tell Kemi what not to
  // re-recommend, so an unbounded backlog on the prompt is pure token waste.
  const recentlyReadSlugs = Array.from(
    new Map(
      [
        ...completions.map((c) => ({ slug: c.story.slug, at: c.completedAt })),
        ...unlocks.map((u) => ({ slug: u.story.slug, at: u.unlockedAt })),
      ]
        .filter((row): row is { slug: string; at: Date } => !!row.slug)
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .map((row) => [row.slug, true] as const),
    ).keys(),
  ).slice(0, 40);

  // A story can carry progress and a completion at once (they finished it on
  // a later pass), and one that's since been unpublished shouldn't be offered
  // back — so both are filtered out before taking the most recent survivor.
  const completedIds = new Set(completions.map((c) => c.storyId));
  const resumable = progressRows.find(
    (p) => !completedIds.has(p.storyId) && p.story.status === "PUBLISHED" && p.story.slug,
  );

  return {
    topGenre,
    topCategoryTitles,
    recentlyReadSlugs,
    cowrieBalance: wallet?.spendingBalance ?? 0,
    inProgress: resumable
      ? {
          slug: resumable.story.slug!,
          title: resumable.story.title,
          percent: Math.round(resumable.scrollFraction * 100),
        }
      : null,
  };
}

/**
 * A short story this reader hasn't touched, leaning toward their taste —
 * what Kemi attaches to a streak-save opener.
 *
 * "Short" is the whole point: the nudge exists because the day is nearly over,
 * so the pick has to be one they can plausibly finish tonight. Taste is the
 * tie-break, not the sort — a perfect-fit 20-minute story is the wrong answer
 * to this particular question.
 */
export async function pickQuickRead(userId: string): Promise<{ slug: string; title: string } | null> {
  const [topGenre, completions, unlocks] = await Promise.all([
    getTopGenre(userId),
    prisma.storyCompletion.findMany({ where: { userId }, select: { storyId: true } }),
    prisma.storyUnlock.findMany({ where: { userId }, select: { storyId: true } }),
  ]);

  const seen = Array.from(new Set([...completions, ...unlocks].map((r) => r.storyId)));

  const candidates = await prisma.story.findMany({
    where: {
      status: "PUBLISHED",
      slug: { not: null },
      isAdult: false,
      ...(seen.length > 0 ? { id: { notIn: seen } } : {}),
    },
    select: { slug: true, title: true, genre: true, readingTime: true },
    orderBy: { readingTime: "asc" },
    take: 12,
  });
  if (candidates.length === 0) return null;

  const onTaste = topGenre ? candidates.find((c) => c.genre === topGenre) : undefined;
  const pick = onTaste ?? candidates[0];
  return { slug: pick.slug!, title: pick.title };
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

  lines.push(`Their cowrie balance is ${ctx.cowrieBalance}.`);

  if (ctx.inProgress) {
    lines.push(
      `They're part-way through "${ctx.inProgress.title}" (${ctx.inProgress.slug}) — about ${ctx.inProgress.percent}% in, paused, not finished. If they ask where they left off or want help picking it back up, see "Getting them back into a story" below.`,
    );
  }

  return lines.join("\n");
}
