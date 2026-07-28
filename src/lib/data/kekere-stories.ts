import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { previewFraction } from "@/lib/utils/text-preview";
import { STORY_TIER_RANGES, SITE_URL, type StoryTier as LowercaseStoryTier } from "@/content/decisions";
import { categoryForTag, resolveCategoryBySlug, type TagCategory } from "@/content/story-tags";
import { sendEmail } from "@/lib/email/send";
import { renderStorySubmittedEmail } from "@/lib/email/templates";
import { KEKERE_SUBMISSIONS_FROM } from "@/lib/constants";
import { getRatingSummaryByStory } from "@/lib/data/kekere-ratings";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";
import { generateUUID } from "@/lib/utils/uuid";
import type { Prisma, Story, StoryStatus, StoryTier, Tag } from "@prisma/client";

export class StoryNotFoundError extends Error {
  constructor() {
    super("Story not found");
    this.name = "StoryNotFoundError";
  }
}

export class StoryForbiddenError extends Error {
  constructor() {
    super("You don't have permission to do that");
    this.name = "StoryForbiddenError";
  }
}

export class StoryIllegalStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoryIllegalStateError";
  }
}

const EDITABLE_STATUSES: StoryStatus[] = ["DRAFT", "REVISIONS_REQUESTED"];

function defaultCowrieCostForTier(tier: StoryTier): number {
  const [min, max] = STORY_TIER_RANGES[tier.toLowerCase() as LowercaseStoryTier];
  return Math.round((min + max) / 2);
}

const authorInclude = {
  author: { select: { id: true, name: true, slug: true, avatarColor: true, avatar: true, bio: true } },
  tags: { include: { tag: true } },
} as const;

export type StoryWithAuthor = Story & {
  author: { id: string; name: string; slug: string | null; avatarColor: string | null; avatar: string | null; bio: string | null };
  tags: Array<{ tag: Tag }>;
};

export interface ListStoriesParams {
  tier?: StoryTier | StoryTier[];
  /** Defaults to PUBLISHED — callers must explicitly pass a different status
   * (e.g. an author viewing their own drafts), the public feed never should. */
  status?: StoryStatus;
  search?: string;
  sort?: "recent" | "trending";
  page?: number;
  pageSize?: number;
  genre?: string;
}

export interface ListStoriesResult {
  stories: StoryWithAuthor[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Unlocks in the last N days, descending — see listStoriesTrending below. */
const TRENDING_WINDOW_DAYS = 7;

export async function listStories(params: ListStoriesParams = {}): Promise<ListStoriesResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 12));
  const status = params.status ?? "PUBLISHED";

  const where: Prisma.StoryWhereInput = {
    status,
    ...(params.tier
      ? { tier: Array.isArray(params.tier) ? { in: params.tier } : params.tier }
      : {}),
    ...(params.genre ? { genre: params.genre } : {}),
...(params.search
      ? {
          OR: [
            { title: { contains: params.search, mode: "insensitive" } },
            { hookLine: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (params.sort === "trending") {
    return listStoriesTrending(where, page, pageSize);
  }

  const [stories, total] = await Promise.all([
    prisma.story.findMany({
      where,
      include: authorInclude,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.story.count({ where }),
  ]);

  return { stories, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

const SEARCH_SUGGESTION_LIMIT = 8;
const SEARCH_MIN_QUERY_LENGTH = 2;

/**
 * Typeahead search for the feed's search bar — ranked, tiered relevance
 * rather than a single flat OR match, so "kek" surfaces a story titled
 * "Kekere Nights" before one that merely mentions "kekere" in its hook
 * line. Three tiers, each excluding stories already picked up by an
 * earlier tier, stopping as soon as the result limit is filled:
 *   1. Title starts with the query
 *   2. Title contains the query elsewhere
 *   3. Hook line or author name contains the query
 * Plain `contains`/`startsWith` (no pg_trgm) — no typo tolerance, but no
 * new Postgres extension or migration either.
 */
export async function searchStories(query: string): Promise<StoryWithAuthor[]> {
  const q = query.trim();
  if (q.length < SEARCH_MIN_QUERY_LENGTH) return [];

  const baseWhere: Prisma.StoryWhereInput = { status: "PUBLISHED" };
  const found: StoryWithAuthor[] = [];
  const foundIds = new Set<string>();

  async function runTier(where: Prisma.StoryWhereInput) {
    const remaining = SEARCH_SUGGESTION_LIMIT - found.length;
    if (remaining <= 0) return;
    const results = await prisma.story.findMany({
      where: { ...baseWhere, id: { notIn: Array.from(foundIds) }, ...where },
      include: authorInclude,
      orderBy: { publishedAt: "desc" },
      take: remaining,
    });
    for (const story of results) {
      found.push(story);
      foundIds.add(story.id);
    }
  }

  await runTier({ title: { startsWith: q, mode: "insensitive" } });
  await runTier({ title: { contains: q, mode: "insensitive" } });
  await runTier({
    OR: [
      { hookLine: { contains: q, mode: "insensitive" } },
      { author: { name: { contains: q, mode: "insensitive" } } },
    ],
  });

  return found;
}

/**
 * A story only counts as trending once at least this many *distinct*
 * readers have unlocked it in the window (StoryUnlock is unique per
 * user+story, so one row per distinct unlocker — no separate dedupe
 * needed). One person opening a story is not a trend, no matter how small
 * the reader base is — raise this further once there's real volume, but it
 * should never drop back to 1.
 */
const MIN_TRENDING_UNLOCKS = 3;

/**
 * Trending formula: each story's recency-weighted share of unique readers
 * who unlocked *anything* in the last 7 days.
 *
 * Two ideas combined:
 *  1. Share, not raw count — a story with 2 unlocks out of 5 active readers
 *     (40%) outranks one with 3 unlocks out of 200 (1.5%), so the metric
 *     stays meaningful as the reader base grows instead of meaning
 *     something different at every scale.
 *  2. Recency weighting — an unlock from an hour ago counts close to full
 *     weight, one from nearly a week ago counts close to zero (linear decay
 *     across the window). Otherwise a story that had a burst of unlocks 6
 *     days ago but nothing since would keep outranking something genuinely
 *     picking up momentum today, for the rest of the week.
 *
 * Stories with fewer than MIN_TRENDING_UNLOCKS distinct unlockers in the
 * window are excluded entirely regardless of score — "trending" means real,
 * current, multi-reader engagement, not a backfilled list padded out with
 * whatever one person happened to open.
 */
async function listStoriesTrending(
  where: Prisma.StoryWhereInput,
  page: number,
  pageSize: number
): Promise<ListStoriesResult> {
  const now = Date.now();
  const windowStart = new Date(now - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const windowMs = now - windowStart.getTime();

  const [matchingStories, recentUnlocks] = await Promise.all([
    // publishedAt-ordered so ties in trending score break deterministically
    // (newest first) instead of relying on undefined DB row order.
    prisma.story.findMany({ where, select: { id: true }, orderBy: { publishedAt: "desc" } }),
    prisma.storyUnlock.findMany({
      where: { unlockedAt: { gte: windowStart } },
      select: { storyId: true, userId: true, unlockedAt: true },
    }),
  ]);

  const activeReaderCount = Math.max(new Set(recentUnlocks.map((u) => u.userId)).size, 1);
  const matchingIdSet = new Set(matchingStories.map((s) => s.id));

  const unlockerCountByStoryId = new Map<string, number>();
  const weightedScoreByStoryId = new Map<string, number>();
  for (const unlock of recentUnlocks) {
    if (!matchingIdSet.has(unlock.storyId)) continue;
    unlockerCountByStoryId.set(unlock.storyId, (unlockerCountByStoryId.get(unlock.storyId) ?? 0) + 1);
    const weight = Math.max(0, 1 - (now - unlock.unlockedAt.getTime()) / windowMs);
    weightedScoreByStoryId.set(unlock.storyId, (weightedScoreByStoryId.get(unlock.storyId) ?? 0) + weight);
  }

  const scoreByStoryId = new Map(
    Array.from(weightedScoreByStoryId.entries())
      .filter(([storyId]) => (unlockerCountByStoryId.get(storyId) ?? 0) >= MIN_TRENDING_UNLOCKS)
      .map(([storyId, weighted]) => [storyId, weighted / activeReaderCount]),
  );

  const orderedIds = matchingStories
    .map((s) => s.id)
    .filter((id) => scoreByStoryId.has(id))
    .sort((a, b) => scoreByStoryId.get(b)! - scoreByStoryId.get(a)!);

  const total = orderedIds.length;
  const pageIds = orderedIds.slice((page - 1) * pageSize, page * pageSize);

  const stories = pageIds.length
    ? await prisma.story.findMany({ where: { id: { in: pageIds } }, include: authorInclude })
    : [];

  // Prisma's `id: { in: [...] }` doesn't preserve array order — re-sort to
  // match the computed trending ranking.
  const positionById = new Map(pageIds.map((id, i) => [id, i]));
  stories.sort((a, b) => (positionById.get(a.id) ?? 0) - (positionById.get(b.id) ?? 0));

  return { stories, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// Wrapped in React's cache() — also used internally by getStoryForReader, so
// this dedupes both the new SEO generateMetadata call and the page's own
// call to a single query per request instead of two.
export const getStoryById = cache(async (id: string): Promise<StoryWithAuthor | null> => {
  return prisma.story.findUnique({ where: { id }, include: authorInclude });
});

export const getStoryBySlug = cache(async (slug: string): Promise<StoryWithAuthor | null> => {
  return prisma.story.findUnique({ where: { slug }, include: authorInclude });
});

/** Resolves the story detail route's [slug] param, which may be the real
 * slug (the normal case) or a legacy/shared cuid link from before slugs
 * existed — tries slug first, falls back to id, and tells the caller which
 * one matched so it can redirect an id-matched request to the canonical
 * slug URL (see the story page). */
export async function getStoryBySlugOrId(
  slugOrId: string
): Promise<{ story: StoryWithAuthor; matchedBy: "slug" | "id" } | null> {
  const bySlug = await getStoryBySlug(slugOrId);
  if (bySlug) return { story: bySlug, matchedBy: "slug" };
  const byId = await getStoryById(slugOrId);
  if (byId) return { story: byId, matchedBy: "id" };
  return null;
}

async function isStoryUnlockedFor(
  story: Pick<Story, "id" | "cowrieCost" | "authorId">,
  userId?: string
): Promise<boolean> {
  if (!userId) return false;
  if (story.authorId === userId) return true;

  // Admins get all content unlocked — they need to review and test everything.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") return true;

  const unlock = await prisma.storyUnlock.findUnique({
    where: { userId_storyId: { userId, storyId: story.id } },
  });
  return !!unlock;
}

export { isStoryUnlockedFor as isStoryUnlocked };

export interface StoryForReader extends Omit<StoryWithAuthor, "body"> {
  unlocked: boolean;
  /** True when this reader hasn't unlocked anything yet AND hasn't used
   * their one free first read — lets the reader UI offer this specific
   * story free instead of gating on cowrie balance. */
  firstReadFree: boolean;
  body: TiptapDoc;
}

/** How many stories have gone live since `since` — powers the "N new
 *  stories since you left" feed greeting. */
export async function countPublishedStoriesSince(since: Date): Promise<number> {
  return prisma.story.count({ where: { status: "PUBLISHED", publishedAt: { gte: since } } });
}

export async function hasFreeReadAvailable(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { freeReadUsed: true } });
  return !!user && !user.freeReadUsed;
}

/**
 * The body returned here is ALREADY truncated server-side when locked — the
 * full text is never sent to the client at all for a story the requester
 * hasn't unlocked, not just hidden by CSS (see Phase 10's StoryReader, which
 * did the truncation client-side against the full mock body; this replaces
 * that with a server-side gate now that the full body is real content).
 */
export async function getStoryForReader(
  id: string,
  userId?: string
): Promise<StoryForReader | null> {
  const story = await getStoryById(id);
  if (!story || story.status !== "PUBLISHED") return null;

  const unlocked = await isStoryUnlockedFor(story, userId);
  const firstReadFree = !unlocked && (await hasFreeReadAvailable(userId));
  let body = story.body as unknown as TiptapDoc;

  // A story saved before paragraph ids existed (or whose id was otherwise
  // never persisted) would leave the reader's Tiptap editor to mint a fresh
  // random id for that paragraph on every single page load — since that id
  // is random, it can never independently match what the server validates a
  // highlight/comment against, so every attempt on that paragraph fails.
  // Backfilling and persisting it here, once, the first time it's read,
  // keeps the id stable across loads so client and server agree from then on.
  //
  // Deliberately plain JSON manipulation rather than doc-utils.ts's
  // ensureParagraphIds (which round-trips through Tiptap/ProseMirror's
  // Schema/Node/Extension classes) — this function is reachable from a
  // Server Component (the story page), and pulling that machinery into the
  // Server Component's module graph broke React's RSC serialization of the
  // page's props entirely (a generic "Only plain objects... Classes...  not
  // supported" error), even though the resulting body was itself confirmed
  // to be plain, JSON-safe data. Route handlers (where ensureParagraphIds is
  // otherwise used) don't have this constraint.
  if (body.content?.some((p) => p.type === "paragraph" && !p.attrs?.id)) {
    body = {
      ...body,
      content: body.content.map((p) =>
        p.type === "paragraph" && !p.attrs?.id ? { ...p, attrs: { ...p.attrs, id: generateUUID() } } : p
      ),
    };
    await prisma.story.update({
      where: { id: story.id },
      data: { body: body as unknown as Prisma.InputJsonValue },
    });
  }

  return { ...story, unlocked, firstReadFree, body: unlocked ? body : previewFraction(body) };
}

/** No status filter — for the author viewing/editing their own story
 * (including drafts), unlike getStoryForReader which only ever returns
 * PUBLISHED stories. Throws if the story doesn't exist or isn't theirs, so
 * every call site gets the same 404-vs-403 distinction for free. */
export async function getStoryForAuthor(id: string, authorId: string): Promise<StoryWithAuthor> {
  const story = await getStoryById(id);
  if (!story) throw new StoryNotFoundError();
  if (story.authorId !== authorId) throw new StoryForbiddenError();
  return story;
}

export async function listStoriesByAuthor(authorId: string): Promise<StoryWithAuthor[]> {
  return prisma.story.findMany({
    where: { authorId },
    include: authorInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export interface StoryDraftInput {
  title: string;
  hookLine: string;
  body: TiptapDoc;
  wordCount: number;
  readingTime: number;
  genre?: string;
  tier?: StoryTier;
  cowrieCost?: number;
  isSerialized?: boolean;
  chapters?: Prisma.InputJsonValue;
  /** Set only alongside a body save — the autosave watermark StoryEditor's
   * conflict detection compares against. See PUT /api/kekere/stories/[id]. */
  lastSavedAt?: Date;
}

export async function createStory(authorId: string, input: StoryDraftInput): Promise<Story> {
  const tier = input.tier ?? "STANDARD";
  return prisma.story.create({
    data: {
      authorId,
      title: input.title,
      hookLine: input.hookLine,
      body: input.body as unknown as Prisma.InputJsonValue,
      wordCount: input.wordCount,
      readingTime: input.readingTime,
      genre: input.genre,
      tier,
      cowrieCost: input.cowrieCost ?? defaultCowrieCostForTier(tier),
      isSerialized: input.isSerialized ?? false,
      chapters: input.chapters,
      status: "DRAFT",
    },
  });
}

/** Author-only, and only while the story is still DRAFT or
 * REVISIONS_REQUESTED — once it's in the moderation queue (SUBMITTED) or
 * further along, edits are locked until a decision is made. */
export async function updateStory(
  id: string,
  authorId: string,
  input: Partial<StoryDraftInput>
): Promise<Story> {
  const story = await getStoryForAuthor(id, authorId);
  if (!EDITABLE_STATUSES.includes(story.status)) {
    throw new StoryIllegalStateError(
      `Can't edit a story while it's ${story.status} — only DRAFT or REVISIONS_REQUESTED.`
    );
  }

  return prisma.story.update({
    where: { id },
    data: {
      ...input,
      body: input.body as unknown as Prisma.InputJsonValue | undefined,
      cowrieCost: input.tier && input.cowrieCost === undefined
        ? defaultCowrieCostForTier(input.tier)
        : input.cowrieCost,
    },
  });
}

/** Author-only. Only a draft (never submitted) or a rejected story (done
 * with review) can be deleted — anything mid-review (SUBMITTED, REVIEWING,
 * REVISIONS_REQUESTED, PENDING_CONTRACT) can't be deleted out from under
 * the moderation queue, and PUBLISHED stories are already public. */
const DELETABLE_STATUSES: StoryStatus[] = ["DRAFT", "REJECTED"];

export async function deleteStory(id: string, authorId: string): Promise<void> {
  const story = await getStoryForAuthor(id, authorId);
  if (!DELETABLE_STATUSES.includes(story.status)) {
    throw new StoryIllegalStateError("Only a draft or a rejected story can be deleted.");
  }
  await prisma.story.delete({ where: { id } });
}

/** Author-only. Covers both the first submission (DRAFT → SUBMITTED) and
 * resubmission after feedback (REVISIONS_REQUESTED → SUBMITTED) — the spec
 * only names the former, but without the latter a story sent back for
 * revisions could never re-enter the queue. */
export async function submitStory(id: string, authorId: string): Promise<Story> {
  const story = await getStoryForAuthor(id, authorId);
  if (!EDITABLE_STATUSES.includes(story.status)) {
    throw new StoryIllegalStateError(
      `Can't submit a story while it's ${story.status}.`
    );
  }

  const updated = await prisma.story.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
    include: { author: { select: { name: true, email: true } } },
  });

  const submittedHtml = await renderStorySubmittedEmail({
    writerName: updated.author.name,
    storyTitle: updated.title,
    storyUrl: `${SITE_URL}/kekere/write?id=${updated.id}`,
  });
  await sendEmail({
    to: updated.author.email,
    subject: `We've got "${updated.title}" — Kekere Stories`,
    body: `Hi ${updated.author.name},\n\nThank you for submitting "${updated.title}" to Kekere Stories. It's now with our editorial team for review.\n\nWe read every submission carefully, so it usually takes us 5–7 business days to get back to you. We'll email you the moment we have a decision — no need to do anything else in the meantime.\n\nKemi, from the Kekere Stories editorial team`,
    html: submittedHtml,
    from: KEKERE_SUBMISSIONS_FROM,
  });

  return updated;
}

export interface AuthorStorySummary {
  id: string;
  title: string;
  hookLine: string | null;
  status: StoryStatus;
  wordCount: number;
  updatedAt: Date;
  lastSavedAt: Date | null;
}

export async function getStoriesByAuthor(authorId: string): Promise<AuthorStorySummary[]> {
  return prisma.story.findMany({
    where: { authorId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      hookLine: true,
      status: true,
      wordCount: true,
      updatedAt: true,
      lastSavedAt: true,
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Feed-specific data fetchers (used by the server-component feed page)
// ────────────────────────────────────────────────────────────────────────────

/** Stories the user has opened but not finished: 5–90% read, not completed. */
export async function getInProgressStories(userId: string): Promise<StoryWithAuthor[]> {
  const progress = await prisma.storyReadingProgress.findMany({
    where: {
      userId,
      scrollFraction: { gte: 0.05, lte: 0.9 },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: { storyId: true },
  });

  const completedIds = await prisma.storyCompletion.findMany({
    where: { userId, storyId: { in: progress.map((p) => p.storyId) } },
    select: { storyId: true },
  });
  const completedSet = new Set(completedIds.map((c) => c.storyId));

  const ids = progress.map((p) => p.storyId).filter((id) => !completedSet.has(id));
  if (ids.length === 0) return [];

  const stories = await prisma.story.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    include: authorInclude,
  });

  const pos = new Map(ids.map((id, i) => [id, i]));
  return stories.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
}

/**
 * Stories the system thinks the user will love, based on tag overlap with
 * stories they have completed. Excludes already-read stories.
 */
export async function getRecommendedStories(userId: string, limit = 12): Promise<StoryWithAuthor[]> {
  const completions = await prisma.storyCompletion.findMany({
    where: { userId },
    select: { storyId: true },
  });
  const completedIds = completions.map((c) => c.storyId);
  if (completedIds.length === 0) return [];

  const completedTags = await prisma.storyTag.findMany({
    where: { storyId: { in: completedIds } },
    select: { tagId: true },
  });

  if (completedTags.length === 0) return [];

  const tagIds = Array.from(new Set(completedTags.map((t) => t.tagId)));

  const unlocks = await prisma.storyUnlock.findMany({
    where: { userId },
    select: { storyId: true },
  });
  const unlockedIds = unlocks.map((u) => u.storyId);
  const excludeIds = new Set([...completedIds, ...unlockedIds]);

  const candidates = await prisma.storyTag.findMany({
    where: {
      tagId: { in: tagIds },
      storyId: { notIn: Array.from(excludeIds) },
      story: { status: "PUBLISHED" },
    },
    select: { storyId: true, tagId: true },
  });

  const scoreMap = new Map<string, number>();
  for (const c of candidates) {
    scoreMap.set(c.storyId, (scoreMap.get(c.storyId) ?? 0) + 1);
  }

  const topIds = Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (topIds.length === 0) return [];

  const stories = await prisma.story.findMany({
    where: { id: { in: topIds } },
    include: authorInclude,
  });

  const pos = new Map(topIds.map((id, i) => [id, i]));
  return stories.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
}

/** Ranks a set of story ids by recent-unlock popularity (the same signal
 *  "Now Trending" uses), tiebreaking by publish recency — a sensible
 *  default order for any row that doesn't have a more specific ranking of
 *  its own. Used by getFeedTagRows below, and by the taste-profile
 *  signature row in kekere-taste.ts. */
export async function rankStoryIdsByRecentPopularity(storyIds: string[], limit: number): Promise<string[]> {
  if (storyIds.length === 0) return [];
  const windowStart = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [unlockCounts, stories] = await Promise.all([
    prisma.storyUnlock.groupBy({
      by: ["storyId"],
      where: { storyId: { in: storyIds }, unlockedAt: { gte: windowStart } },
      _count: { storyId: true },
    }),
    prisma.story.findMany({ where: { id: { in: storyIds } }, select: { id: true, publishedAt: true } }),
  ]);
  const unlockByStory = new Map(unlockCounts.map((u) => [u.storyId, u._count.storyId]));
  const publishedByStory = new Map(stories.map((s) => [s.id, s.publishedAt?.getTime() ?? 0]));
  return [...storyIds]
    .sort((a, b) => {
      const unlockDiff = (unlockByStory.get(b) ?? 0) - (unlockByStory.get(a) ?? 0);
      if (unlockDiff !== 0) return unlockDiff;
      return (publishedByStory.get(b) ?? 0) - (publishedByStory.get(a) ?? 0);
    })
    .slice(0, limit);
}

// --- Daily-rotated, blended feed ranking ------------------------------

const NEWNESS_WINDOW_DAYS = 21;
// A story's average rating is shrunk toward this neutral prior in
// proportion to how few ratings it has — one 5-star rating shouldn't
// outrank a story with fifty, and one 1-star shouldn't sink a story nobody's
// really weighed in on yet. RATING_PRIOR_WEIGHT is "how many real ratings it
// takes to outweigh the prior" — small on purpose, since most stories here
// will have few ratings and a prior that's too strong would just flatten
// this signal into noise.
const RATING_PRIOR = 3.5;
const RATING_PRIOR_WEIGHT = 3;

const FEED_ROTATION_WEIGHTS = {
  popularity: 0.3,
  newness: 0.15,
  rating: 0.2,
  preference: 0.2,
  randomness: 0.15,
} as const;

/** Deterministic string → [0, 1). FNV-1a, 32-bit. Not a security or
 *  statistical primitive — just enough spread that "which of these
 *  otherwise-similar stories gets today's spotlight" doesn't always land on
 *  the same one, while staying identical for the same (day, reader, story)
 *  triple across every request. */
function seededUnitInterval(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0xffffffff;
}

/** Min-max normalize to [0, 1]. A constant input (every value tied,
 *  including the common case of a single-element array) returns 0.5 for
 *  every entry rather than dividing by zero — a signal that isn't
 *  differentiating anything contributes nothing to the ordering, which is
 *  exactly what should happen when e.g. no story in the set has any
 *  ratings yet. */
function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

export interface FeedRotationOptions {
  /** Per-story raw affinity weight — typically a reader's category score
   *  (kekere-taste.ts) applied to that story's own tags. Omit for a row
   *  that isn't personalized (a logged-out reader, or a section like
   *  Winner's Circle that's deliberately the same "best of" set for
   *  everyone) — every story then gets the same neutral value after
   *  normalizing, so the term is present in the blend but doesn't move the
   *  ordering. */
  preferenceScores?: Map<string, number>;
  /** Identifies "this reader, today" — e.g. `${userId ?? "anon"}:${utcDayNumber}`.
   *  This is the entire rotation mechanism: nothing is stored anywhere, the
   *  randomness term is just a pure function of this key plus each story's
   *  id, so it's identical across every request today and different again
   *  tomorrow, without a cron job or a cache table. */
  rotationKey: string;
}

/**
 * Ranks stories by a blended score — recent popularity, how new it is, how
 * well it's rated, this reader's taste, and a daily-rotating random nudge —
 * rather than one hard signal alone. This is the feed's row ranker; the
 * older rankStoryIdsByRecentPopularity above is kept for
 * kekere-taste.ts's signature row, which wants "purely popular within an
 * already-personalized category" on purpose, not a second layer of taste
 * weighting on top of the category pick it already made.
 */
export async function rankStoriesBlended(
  storyIds: string[],
  limit: number,
  options: FeedRotationOptions
): Promise<string[]> {
  if (storyIds.length === 0) return [];

  const windowStart = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [unlockCounts, stories, ratings] = await Promise.all([
    prisma.storyUnlock.groupBy({
      by: ["storyId"],
      where: { storyId: { in: storyIds }, unlockedAt: { gte: windowStart } },
      _count: { storyId: true },
    }),
    prisma.story.findMany({ where: { id: { in: storyIds } }, select: { id: true, publishedAt: true } }),
    getRatingSummaryByStory(storyIds),
  ]);

  const unlockByStory = new Map(unlockCounts.map((u) => [u.storyId, u._count.storyId]));
  const publishedByStory = new Map(stories.map((s) => [s.id, s.publishedAt?.getTime() ?? 0]));
  const now = Date.now();

  const popularityRaw = storyIds.map((id) => unlockByStory.get(id) ?? 0);
  const newnessRaw = storyIds.map((id) => {
    const publishedAt = publishedByStory.get(id) ?? 0;
    if (!publishedAt) return 0;
    const ageDays = (now - publishedAt) / (24 * 60 * 60 * 1000);
    return Math.max(0, 1 - ageDays / NEWNESS_WINDOW_DAYS);
  });
  const ratingRaw = storyIds.map((id) => {
    const summary = ratings.get(id);
    if (!summary || summary.average === null) return RATING_PRIOR;
    return (
      (summary.average * summary.count + RATING_PRIOR * RATING_PRIOR_WEIGHT) /
      (summary.count + RATING_PRIOR_WEIGHT)
    );
  });
  const preferenceRaw = storyIds.map((id) => options.preferenceScores?.get(id) ?? 0);
  const randomRaw = storyIds.map((id) => seededUnitInterval(`${options.rotationKey}:${id}`));

  const popularity = normalize(popularityRaw);
  const newness = normalize(newnessRaw);
  const rating = normalize(ratingRaw);
  const preference = normalize(preferenceRaw);
  const randomness = normalize(randomRaw);

  return storyIds
    .map((id, i) => ({
      id,
      score:
        FEED_ROTATION_WEIGHTS.popularity * popularity[i] +
        FEED_ROTATION_WEIGHTS.newness * newness[i] +
        FEED_ROTATION_WEIGHTS.rating * rating[i] +
        FEED_ROTATION_WEIGHTS.preference * preference[i] +
        FEED_ROTATION_WEIGHTS.randomness * randomness[i],
    }))
    .sort((a, b) => b.score - a.score) // stable — ties (e.g. two brand-new, unrated, unlocked stories) keep storyIds' original relative order
    .slice(0, limit)
    .map((s) => s.id);
}

/** Stories grouped by category, for the tag rows on the feed. Multiple
 *  requested tag slugs that share an explicit category (see
 *  categoryForTag/TAG_CATEGORIES in story-tags.ts — e.g. dark, creepy, and
 *  psychological) collapse into a single combined row instead of one row
 *  each. Returns only categories that have at least one published story, in
 *  the order their first member tag appears in the input list.
 *
 *  Within each row, story order comes from rankStoriesBlended — see
 *  FeedRotationOptions above. `rotation.categoryScores`, if given, is a
 *  reader's per-category affinity (kekere-taste.ts); it's turned into a
 *  per-story score here (a story's preference weight is the highest score
 *  among its own categories, not a sum — matching any one category the
 *  reader loves earns full credit, having two doesn't earn double). */
export async function getFeedTagRows(
  tagSlugs: readonly string[],
  limit = 8,
  rotation?: { categoryScores?: Map<string, number>; rotationKey: string }
): Promise<Array<{ slug: string; storyIds: string[] }>> {
  const categoriesInOrder: TagCategory[] = [];
  const seenCategorySlugs = new Set<string>();
  for (const slug of tagSlugs) {
    const category = categoryForTag(slug);
    if (!seenCategorySlugs.has(category.slug)) {
      seenCategorySlugs.add(category.slug);
      categoriesInOrder.push(category);
    }
  }
  if (categoriesInOrder.length === 0) return [];

  // Four queries, whatever the category count. This used to run one
  // storyTag lookup plus a two-query ranking PER category — fine while the
  // feed covered nine of them, but every tag now has a row, and the old
  // shape would have turned that into the better part of eighty queries on
  // the app's most-visited page. Grouping in memory is the difference
  // between "every story is findable" costing nothing and costing the feed.
  const [taggedRows, allTags] = await Promise.all([
    prisma.storyTag.findMany({
      where: { story: { status: "PUBLISHED" } },
      select: { storyId: true, tagId: true },
    }),
    prisma.tag.findMany({ select: { id: true, slug: true } }),
  ]);
  if (taggedRows.length === 0) return [];

  const slugByTagId = new Map(allTags.map((t) => [t.id, t.slug]));
  const storyIdsByTagSlug = new Map<string, string[]>();
  const categorySlugsByStoryId = new Map<string, Set<string>>();
  for (const row of taggedRows) {
    const slug = slugByTagId.get(row.tagId);
    if (!slug) continue;
    const bucket = storyIdsByTagSlug.get(slug);
    if (bucket) bucket.push(row.storyId);
    else storyIdsByTagSlug.set(slug, [row.storyId]);

    const categorySlug = categoryForTag(slug).slug;
    const set = categorySlugsByStoryId.get(row.storyId);
    if (set) set.add(categorySlug);
    else categorySlugsByStoryId.set(row.storyId, new Set([categorySlug]));
  }

  const everyStoryId = Array.from(new Set(taggedRows.map((r) => r.storyId)));

  const preferenceScores = rotation?.categoryScores
    ? new Map(
        everyStoryId.map((id) => {
          const categories = categorySlugsByStoryId.get(id);
          if (!categories) return [id, 0];
          const scores = Array.from(categories).map((c) => rotation.categoryScores!.get(c) ?? 0);
          return [id, Math.max(0, ...scores)];
        }),
      )
    : undefined;

  // Ranked once over every tagged story, then sliced per category — the
  // ordering is identical to ranking each row separately, because every
  // signal in the blend only ever looks at a story's own data.
  const ranked = await rankStoriesBlended(everyStoryId, everyStoryId.length, {
    preferenceScores,
    rotationKey: rotation?.rotationKey ?? "anon",
  });

  return categoriesInOrder
    .map((category) => {
      const members = new Set(
        category.tagSlugs.flatMap((slug) => storyIdsByTagSlug.get(slug) ?? []),
      );
      if (members.size === 0) return { slug: category.slug, storyIds: [] as string[] };
      return { slug: category.slug, storyIds: ranked.filter((id) => members.has(id)).slice(0, limit) };
    })
    .filter((r) => r.storyIds.length > 0);
}

/** Fetch full story rows for a set of IDs, preserving the given order. */
export async function getStoriesByIds(ids: string[]): Promise<StoryWithAuthor[]> {
  if (ids.length === 0) return [];
  const stories = await prisma.story.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    include: authorInclude,
  });
  const pos = new Map(ids.map((id, i) => [id, i]));
  return stories.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
}

/** Stories for a tag/category browse page (/kekere/tag/[slug]). `slug` can
 *  be either a single tag's own slug (the common case — still works exactly
 *  as before for every tag with no explicit category) or a combined
 *  category slug, in which case this queries across every member tag —
 *  otherwise "See more" from a merged feed row would silently drop
 *  everything but one representative tag's stories. */
export async function listStoriesByTag(
  slug: string,
  page = 1,
  pageSize = 12
): Promise<ListStoriesResult> {
  const category = resolveCategoryBySlug(slug);
  if (!category) return { stories: [], total: 0, page, pageSize, totalPages: 0 };

  const tags = await prisma.tag.findMany({
    where: { slug: { in: [...category.tagSlugs] } },
    select: { id: true },
  });
  const tagIds = tags.map((t) => t.id);
  if (tagIds.length === 0) return { stories: [], total: 0, page, pageSize, totalPages: 0 };

  const [storiesRaw, total] = await Promise.all([
    prisma.story.findMany({
      where: { status: "PUBLISHED", tags: { some: { tagId: { in: tagIds } } } },
      include: authorInclude,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.story.count({
      where: { status: "PUBLISHED", tags: { some: { tagId: { in: tagIds } } } },
    }),
  ]);

  return {
    stories: storiesRaw,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
