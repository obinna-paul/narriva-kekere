import { prisma } from "@/lib/db/prisma";
import { previewFraction } from "@/lib/utils/text-preview";
import { STORY_TIER_RANGES, type StoryTier as LowercaseStoryTier } from "@/content/decisions";
import { TAG_BY_SLUG } from "@/content/story-tags";
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

export async function getStoryById(id: string): Promise<StoryWithAuthor | null> {
  return prisma.story.findUnique({ where: { id }, include: authorInclude });
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

/** Author-only, DRAFT status only — once submitted, a story can't be
 * deleted out from under the moderation queue. */
export async function deleteStory(id: string, authorId: string): Promise<void> {
  const story = await getStoryForAuthor(id, authorId);
  if (story.status !== "DRAFT") {
    throw new StoryIllegalStateError("Only draft stories can be deleted.");
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

/** Stories grouped by tag slug, for the tag rows on the feed.
 *  Returns only tags that have at least one published story, in the order supplied. */
export async function getFeedTagRows(
  tagSlugs: readonly string[],
  limit = 8
): Promise<Array<{ slug: string; storyIds: string[] }>> {
  const tags = await prisma.tag.findMany({
    where: { slug: { in: Array.from(tagSlugs) } },
    select: { id: true, slug: true },
  });

  // Group tags by feedHeading so related tags (dark, creepy, psychological)
  // appear in a single combined feed row instead of 3 separate rows
  const tagsByHeading = new Map<string, Array<{ id: string; slug: string }>>();
  const headingOrder = new Map<string, number>();

  for (const tag of tags) {
    const tagInfo = TAG_BY_SLUG[tag.slug];
    const heading = tagInfo?.feedHeading ?? tag.slug;
    const firstSlugForHeading = Array.from(tagSlugs).find(
      (slug) => (TAG_BY_SLUG[slug]?.feedHeading ?? slug) === heading
    );

    if (firstSlugForHeading && !headingOrder.has(heading)) {
      headingOrder.set(heading, Array.from(tagSlugs).indexOf(firstSlugForHeading));
    }

    if (!tagsByHeading.has(heading)) {
      tagsByHeading.set(heading, []);
    }
    tagsByHeading.get(heading)!.push(tag);
  }

  // Fetch stories for each feedHeading group
  const results = await Promise.all(
    Array.from(tagsByHeading.entries()).map(async ([heading, tagGroup]) => {
      const tagIds = tagGroup.map((t) => t.id);
      const rows = await prisma.storyTag.findMany({
        where: { tagId: { in: tagIds }, story: { status: "PUBLISHED" } },
        select: { storyId: true },
        take: limit,
      });
      // Use the first tag's slug as the row identifier
      return { slug: tagGroup[0].slug, storyIds: rows.map((r) => r.storyId) };
    })
  );

  return results
    .filter((r) => r.storyIds.length > 0)
    .sort(
      (a, b) =>
        (headingOrder.get(TAG_BY_SLUG[a.slug]?.feedHeading ?? a.slug) ?? 99) -
        (headingOrder.get(TAG_BY_SLUG[b.slug]?.feedHeading ?? b.slug) ?? 99)
    );
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

/** Stories for a tag browse page (/kekere/tag/[slug]). */
export async function listStoriesByTag(
  slug: string,
  page = 1,
  pageSize = 12
): Promise<ListStoriesResult> {
  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) return { stories: [], total: 0, page, pageSize, totalPages: 0 };

  const [storiesRaw, total] = await Promise.all([
    prisma.story.findMany({
      where: { status: "PUBLISHED", tags: { some: { tagId: tag.id } } },
      include: authorInclude,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.story.count({
      where: { status: "PUBLISHED", tags: { some: { tagId: tag.id } } },
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
