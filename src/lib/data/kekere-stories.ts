import { prisma } from "@/lib/db/prisma";
import { previewFraction } from "@/lib/utils/text-preview";
import { STORY_TIER_RANGES, type StoryTier as LowercaseStoryTier } from "@/content/decisions";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";
import type { Prisma, Story, StoryStatus, StoryTier } from "@prisma/client";

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
} as const;

export type StoryWithAuthor = Story & {
  author: { id: string; name: string; slug: string | null; avatarColor: string | null };
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
  /** Beyond the spec's literal filter list (tier/status/search) — added
   * because the Phase 10 feed UI already shipped a genre selector and a
   * "Free" quick-filter pill backed by real per-story data (genre column,
   * cowrieCost === 0), so it was cheap to back them with real filtering
   * instead of leaving them client-only. */
  genre?: string;
  freeOnly?: boolean;
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
    ...(params.freeOnly ? { cowrieCost: 0 } : {}),
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
  if (story.cowrieCost === 0) return true;
  if (!userId) return false;
  if (story.authorId === userId) return true;

  const unlock = await prisma.storyUnlock.findUnique({
    where: { userId_storyId: { userId, storyId: story.id } },
  });
  return !!unlock;
}

export { isStoryUnlockedFor as isStoryUnlocked };

export interface StoryForReader extends Omit<StoryWithAuthor, "body"> {
  unlocked: boolean;
  body: TiptapDoc;
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
  const body = story.body as unknown as TiptapDoc;
  return { ...story, unlocked, body: unlocked ? body : previewFraction(body) };
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
