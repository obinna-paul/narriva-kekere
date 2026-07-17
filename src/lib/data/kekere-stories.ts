import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { previewFraction } from "@/lib/utils/text-preview";
import { STORY_TIER_RANGES, type StoryTier as LowercaseStoryTier } from "@/content/decisions";
import { categoryForTag, resolveCategoryBySlug, type TagCategory } from "@/content/story-tags";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";
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
  author: { select: { id: true, name: true, slug: true, avatarColor: true } },
  tags: { include: { tag: true } },
} as const;

export type StoryWithAuthor = Story & {
  author: { id: string; name: string; slug: string | null; avatarColor: string | null };
  tags: Array<{ tag: Tag }>;
};

export interface ListStoriesParams {
  tier?: StoryTier;
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
    ...(params.tier ? { tier: params.tier } : {}),
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
 * Trending formula: number of StoryUnlock rows in the last 7 days, highest
 * first. Deliberately simple — no decay curve, no weighting — "what's
 * actually being unlocked right now." Stories with zero recent unlocks
 * still appear, just at the bottom, in a stable (insertion) order.
 */
async function listStoriesTrending(
  where: Prisma.StoryWhereInput,
  page: number,
  pageSize: number
): Promise<ListStoriesResult> {
  const windowStart = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [matchingStories, unlockCounts] = await Promise.all([
    prisma.story.findMany({ where, select: { id: true } }),
    prisma.storyUnlock.groupBy({
      by: ["storyId"],
      where: { unlockedAt: { gte: windowStart } },
      _count: { storyId: true },
    }),
  ]);

  const matchingIds = matchingStories.map((s) => s.id);
  const matchingIdSet = new Set(matchingIds);
  const scoreByStoryId = new Map(
    unlockCounts.filter((u) => matchingIdSet.has(u.storyId)).map((u) => [u.storyId, u._count.storyId])
  );

  const orderedIds = [...matchingIds].sort(
    (a, b) => (scoreByStoryId.get(b) ?? 0) - (scoreByStoryId.get(a) ?? 0)
  );
  const total = orderedIds.length;
  const pageIds = orderedIds.slice((page - 1) * pageSize, page * pageSize);

  const stories = await prisma.story.findMany({
    where: { id: { in: pageIds } },
    include: authorInclude,
  });

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
  const body = story.body as unknown as TiptapDoc;
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

  return prisma.story.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });
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

/** Stories grouped by category, for the tag rows on the feed. Multiple
 *  requested tag slugs that share an explicit category (see
 *  categoryForTag/TAG_CATEGORIES in story-tags.ts — e.g. dark, creepy, and
 *  psychological) collapse into a single combined row instead of one row
 *  each. Returns only categories that have at least one published story, in
 *  the order their first member tag appears in the input list. */
export async function getFeedTagRows(
  tagSlugs: readonly string[],
  limit = 8
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

  const allSlugsNeeded = Array.from(new Set(categoriesInOrder.flatMap((c) => c.tagSlugs)));
  const tags = await prisma.tag.findMany({
    where: { slug: { in: allSlugsNeeded } },
    select: { id: true, slug: true },
  });
  const tagIdBySlug = new Map(tags.map((t) => [t.slug, t.id]));

  const results = await Promise.all(
    categoriesInOrder.map(async (category) => {
      const tagIds = category.tagSlugs
        .map((slug) => tagIdBySlug.get(slug))
        .filter((id): id is string => !!id);
      if (tagIds.length === 0) return { slug: category.slug, storyIds: [] as string[] };

      const rows = await prisma.storyTag.findMany({
        where: { tagId: { in: tagIds }, story: { status: "PUBLISHED" } },
        select: { storyId: true },
        take: limit,
      });
      return { slug: category.slug, storyIds: rows.map((r) => r.storyId) };
    })
  );

  return results.filter((r) => r.storyIds.length > 0);
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
