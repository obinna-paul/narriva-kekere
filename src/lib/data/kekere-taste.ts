import { prisma } from "@/lib/db/prisma";
import { categoryForTag, resolveCategoryBySlug, TAG_BY_SLUG } from "@/content/story-tags";
import { rankStoryIdsByRecentPopularity, rankStoriesBlended, getStoriesByIds, type StoryWithAuthor } from "@/lib/data/kekere-stories";

// How much each reading signal contributes to a story's weight before it's
// rolled up into that story's tag categories. Completion is the strongest
// signal (they finished it); a high rating and saving both mean "I want more
// of this" even without finishing; an unlock or a still-in-progress read are
// weaker "I was interested enough to start" signals.
const SIGNAL_WEIGHT = {
  completion: 3,
  highRating: 2, // additive on top of completion, only for a rating >= 4
  saved: 2,
  unlock: 1,
  inProgress: 1,
} as const;

// A signature row needs enough signal behind it to feel earned, not
// manufactured from one half-read story — below this, getSignatureRow
// returns null and the feed just shows its editorial default rows.
const MIN_SIGNATURE_SCORE = 3;

async function getWeightedStoryScores(userId: string): Promise<Map<string, number>> {
  const [completions, highRatings, saved, unlocks, inProgress] = await Promise.all([
    prisma.storyCompletion.findMany({ where: { userId }, select: { storyId: true } }),
    prisma.storyRating.findMany({ where: { userId, rating: { gte: 4 } }, select: { storyId: true } }),
    prisma.savedStory.findMany({ where: { userId }, select: { storyId: true } }),
    prisma.storyUnlock.findMany({ where: { userId }, select: { storyId: true } }),
    prisma.storyReadingProgress.findMany({
      where: { userId, scrollFraction: { gte: 0.05 } },
      select: { storyId: true },
    }),
  ]);

  const scores = new Map<string, number>();
  const add = (storyId: string, weight: number) => scores.set(storyId, (scores.get(storyId) ?? 0) + weight);
  completions.forEach((c) => add(c.storyId, SIGNAL_WEIGHT.completion));
  highRatings.forEach((r) => add(r.storyId, SIGNAL_WEIGHT.highRating));
  saved.forEach((s) => add(s.storyId, SIGNAL_WEIGHT.saved));
  unlocks.forEach((u) => add(u.storyId, SIGNAL_WEIGHT.unlock));
  inProgress.forEach((p) => add(p.storyId, SIGNAL_WEIGHT.inProgress));
  return scores;
}

/** Per-tag affinity score for a user, rolled up from their weighted reading
 *  signals through each engaged story's own tags. Finer-grained than
 *  getUserCategoryScores below (multiple tags can share a category) — this
 *  is what the Preferences page's "we think you prefer stories with these
 *  tags" auto-detection reads from, since showing the actual tags a reader
 *  engaged with is more specific and more checkable than showing a whole
 *  category. Empty for a user with no signal yet. */
export async function getUserTagScores(userId: string): Promise<Map<string, number>> {
  const storyScores = await getWeightedStoryScores(userId);
  if (storyScores.size === 0) return new Map();

  const storyTags = await prisma.storyTag.findMany({
    where: { storyId: { in: Array.from(storyScores.keys()) } },
    select: { storyId: true, tag: { select: { slug: true } } },
  });

  const tagScores = new Map<string, number>();
  for (const st of storyTags) {
    const weight = storyScores.get(st.storyId) ?? 0;
    if (weight === 0) continue;
    tagScores.set(st.tag.slug, (tagScores.get(st.tag.slug) ?? 0) + weight);
  }
  return tagScores;
}

/** Rolls a per-tag score map up to per-category, through categoryForTag
 *  (story-tags.ts) — the shared piece of getUserCategoryScores below and of
 *  kekere-preferences.ts's getUserTagPreferences, which both start from a
 *  getUserTagScores result and need this same rollup without re-running the
 *  underlying signal queries a second time. */
export function rollUpTagScoresToCategoryScores(tagScores: Map<string, number>): Map<string, number> {
  const categoryScores = new Map<string, number>();
  tagScores.forEach((weight, tagSlug) => {
    const category = categoryForTag(tagSlug);
    categoryScores.set(category.slug, (categoryScores.get(category.slug) ?? 0) + weight);
  });
  return categoryScores;
}

/** Per-category affinity score for a user — getUserTagScores rolled up
 *  through categoryForTag (story-tags.ts). Empty for a user with no signal
 *  yet — callers treat that as "no personalization, fall back to the
 *  editorial default." */
export async function getUserCategoryScores(userId: string): Promise<Map<string, number>> {
  const tagScores = await getUserTagScores(userId);
  if (tagScores.size === 0) return new Map();
  return rollUpTagScoresToCategoryScores(tagScores);
}

// A reader who's explicitly told us what they like always outranks pure
// inference — this is added on top of (not instead of) their implicit
// category score, so among several explicitly-preferred categories the ones
// they also actually read more of still sort higher relative to each other.
// Comfortably above any realistic implicit score (SIGNAL_WEIGHT tops out at
// 3 per engagement) so an explicit pick reliably floats above inferred-only
// categories without needing to reason about how active a reader has been.
const EXPLICIT_PREFERENCE_BOOST = 100;

/** Reorders `defaultOrder` by category affinity, highest first — explicit
 *  preferences (set on the Preferences page) first, implicit reading-signal
 *  affinity as the tiebreak within and below that. A stable sort — tags
 *  with equal (including zero) score keep their original editorial
 *  position, so a cold-start reader with neither gets `defaultOrder` back
 *  completely unchanged rather than a special case.
 *
 *  Takes `categoryScores` rather than a userId and computing it internally
 *  — the feed page needs that same map again for within-row ranking
 *  (kekere-stories.ts's getFeedTagRows), and getUserCategoryScores isn't
 *  free (five signal queries plus a tag join), so callers compute it once
 *  and pass it to both rather than this function fetching its own copy.
 *  Pure and synchronous as a result — nothing here does I/O. */
export function getPersonalizedTagOrder<T extends string>(
  defaultOrder: readonly T[],
  categoryScores: Map<string, number>,
  explicitPreferredTagSlugs: readonly string[] = []
): T[] {
  const explicitCategorySlugs = new Set(explicitPreferredTagSlugs.map((slug) => categoryForTag(slug).slug));
  if (categoryScores.size === 0 && explicitCategorySlugs.size === 0) return [...defaultOrder];

  const scoreForTag = (slug: T) => {
    const category = categoryForTag(slug);
    const implicit = categoryScores.get(category.slug) ?? 0;
    const explicitBoost = explicitCategorySlugs.has(category.slug) ? EXPLICIT_PREFERENCE_BOOST : 0;
    return implicit + explicitBoost;
  };
  return [...defaultOrder]
    .map((slug, index) => ({ slug, index, score: scoreForTag(slug) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.slug);
}

/** The reader's single most-completed genre (Story.genre — a free-text
 *  field, unrelated to the tag/category system the rest of this file works
 *  from) — null for anyone with no completions yet, so callers can treat
 *  that as "no personalization available" rather than a fake default. */
export async function getTopGenre(userId: string): Promise<string | null> {
  const completions = await prisma.storyCompletion.findMany({
    where: { userId },
    select: { story: { select: { genre: true } } },
  });
  if (completions.length === 0) return null;

  const counts = new Map<string, number>();
  for (const c of completions) {
    counts.set(c.story.genre, (counts.get(c.story.genre) ?? 0) + 1);
  }

  let topGenre: string | null = null;
  let topCount = 0;
  counts.forEach((count, genre) => {
    if (count > topCount) {
      topGenre = genre;
      topCount = count;
    }
  });
  return topGenre;
}

export interface SignatureRow {
  slug: string;
  title: string;
  storyIds: string[];
}

/** A single personalized row built from the user's single highest-affinity
 *  category — "Because you love {tag}" — excluding stories they've already
 *  completed or unlocked, so it reads as a genuine recommendation rather
 *  than reflecting their own history back at them. Null below
 *  MIN_SIGNATURE_SCORE (including for any cold-start or logged-out user). */
export async function getSignatureRow(userId: string, limit = 8): Promise<SignatureRow | null> {
  const categoryScores = await getUserCategoryScores(userId);
  let topSlug: string | null = null;
  let topScore = 0;
  categoryScores.forEach((score, slug) => {
    if (score >= MIN_SIGNATURE_SCORE && score > topScore) {
      topSlug = slug;
      topScore = score;
    }
  });
  if (!topSlug) return null;

  const category = resolveCategoryBySlug(topSlug);
  if (!category) return null;

  const tags = await prisma.tag.findMany({
    where: { slug: { in: [...category.tagSlugs] } },
    select: { id: true },
  });
  if (tags.length === 0) return null;
  const tagIds = tags.map((t) => t.id);

  const [completions, unlocks] = await Promise.all([
    prisma.storyCompletion.findMany({ where: { userId }, select: { storyId: true } }),
    prisma.storyUnlock.findMany({ where: { userId }, select: { storyId: true } }),
  ]);
  const excludeIds = new Set([...completions.map((c) => c.storyId), ...unlocks.map((u) => u.storyId)]);

  const rows = await prisma.storyTag.findMany({
    where: { tagId: { in: tagIds }, story: { status: "PUBLISHED" } },
    select: { storyId: true },
  });
  const candidateIds = Array.from(new Set(rows.map((r) => r.storyId))).filter((id) => !excludeIds.has(id));
  if (candidateIds.length === 0) return null;

  const storyIds = await rankStoryIdsByRecentPopularity(candidateIds, limit);
  const label = TAG_BY_SLUG[category.tagSlugs[0]]?.label ?? category.title;

  return { slug: category.slug, title: `Because you love ${label}`, storyIds };
}

// Below this many tag-overlap candidates, blend in the freshest published
// stories too — a niche or lightly-tagged story shouldn't leave the "next
// read" pick starved down to one or two options.
const MIN_NEXT_READ_CANDIDATES = 4;
const NEXT_READ_CANDIDATE_POOL = 24;

export interface NextStoryRecommendation {
  story: StoryWithAuthor;
  /** "tag-match" when the pick shares tags with the story just finished
   *  (drives "Because you just read this" framing); "popular" when there
   *  wasn't enough tag overlap and this is a freshness/popularity fallback
   *  instead — kept distinct so the UI doesn't imply a connection that isn't
   *  really there. */
  reason: "tag-match" | "popular";
}

/**
 * The single best "read this next" pick for a reader who just finished
 * `finishedStoryId` — prompts them to keep reading immediately instead of
 * leaving the finish screen as a dead end. Ranked by tag overlap with the
 * story just finished (not the reader's aggregate taste — "just read a
 * thriller" is a stronger signal than lifetime history for what to read in
 * the next five minutes), blended with recency/popularity/rating and, for a
 * logged-in reader, their taste profile, via the same ranker the feed rows
 * use. Always excludes the story just finished and, for a logged-in reader,
 * anything already completed or unlocked.
 *
 * Falls back to the freshest published stories when the finished story has
 * no tags or too few tag-overlap candidates exist, so this practically never
 * comes back null for an active catalog — a reader should see something to
 * read next essentially every time. Mature content is excluded from the
 * pool unless the story just finished was itself marked isAdult, so a
 * G-rated finish doesn't surface an 18+ surprise on the way out.
 */
export async function getNextStoryRecommendation(
  finishedStoryId: string,
  userId: string | null,
): Promise<NextStoryRecommendation | null> {
  const finishedStory = await prisma.story.findUnique({
    where: { id: finishedStoryId },
    select: { isAdult: true },
  });
  if (!finishedStory) return null;
  const matureFilter = finishedStory.isAdult ? {} : { isAdult: false };

  const [finishedTagRows, completions, unlocks] = await Promise.all([
    prisma.storyTag.findMany({ where: { storyId: finishedStoryId }, select: { tagId: true } }),
    userId ? prisma.storyCompletion.findMany({ where: { userId }, select: { storyId: true } }) : Promise.resolve([]),
    userId ? prisma.storyUnlock.findMany({ where: { userId }, select: { storyId: true } }) : Promise.resolve([]),
  ]);

  const excludeIds = new Set<string>([
    finishedStoryId,
    ...completions.map((c) => c.storyId),
    ...unlocks.map((u) => u.storyId),
  ]);
  const tagIds = Array.from(new Set(finishedTagRows.map((t) => t.tagId)));

  let reason: "tag-match" | "popular" = "popular";
  let candidateIds: string[] = [];

  if (tagIds.length > 0) {
    const overlap = await prisma.storyTag.findMany({
      where: {
        tagId: { in: tagIds },
        storyId: { notIn: Array.from(excludeIds) },
        story: { status: "PUBLISHED", ...matureFilter },
      },
      select: { storyId: true },
    });
    const scoreMap = new Map<string, number>();
    for (const o of overlap) scoreMap.set(o.storyId, (scoreMap.get(o.storyId) ?? 0) + 1);
    candidateIds = Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, NEXT_READ_CANDIDATE_POOL)
      .map(([id]) => id);
    if (candidateIds.length > 0) reason = "tag-match";
  }

  if (candidateIds.length < MIN_NEXT_READ_CANDIDATES) {
    const recent = await prisma.story.findMany({
      where: {
        status: "PUBLISHED",
        ...matureFilter,
        id: { notIn: Array.from(new Set([...Array.from(excludeIds), ...candidateIds])) },
      },
      orderBy: { publishedAt: "desc" },
      take: NEXT_READ_CANDIDATE_POOL,
      select: { id: true },
    });
    candidateIds = Array.from(new Set([...candidateIds, ...recent.map((r) => r.id)]));
  }

  if (candidateIds.length === 0) return null;

  // A logged-in reader's taste profile nudges the pick among the candidates
  // above (same "highest of a story's own categories" rollup getFeedTagRows
  // uses) — it never expands or replaces the candidate pool itself, so the
  // pick always still relates to the story just finished when tag overlap
  // exists.
  let preferenceScores: Map<string, number> | undefined;
  if (userId) {
    const categoryScores = await getUserCategoryScores(userId);
    if (categoryScores.size > 0) {
      const candidateTagRows = await prisma.storyTag.findMany({
        where: { storyId: { in: candidateIds } },
        select: { storyId: true, tag: { select: { slug: true } } },
      });
      const categoriesByStory = new Map<string, Set<string>>();
      for (const row of candidateTagRows) {
        const categorySlug = categoryForTag(row.tag.slug).slug;
        const set = categoriesByStory.get(row.storyId);
        if (set) set.add(categorySlug);
        else categoriesByStory.set(row.storyId, new Set([categorySlug]));
      }
      preferenceScores = new Map(
        candidateIds.map((id) => {
          const categories = categoriesByStory.get(id);
          if (!categories) return [id, 0];
          const scores = Array.from(categories).map((c) => categoryScores.get(c) ?? 0);
          return [id, Math.max(0, ...scores)];
        }),
      );
    }
  }

  const rankedIds = await rankStoriesBlended(candidateIds, 1, {
    preferenceScores,
    rotationKey: `${userId ?? "anon"}:next:${finishedStoryId}`,
  });
  if (rankedIds.length === 0) return null;

  const stories = await getStoriesByIds(rankedIds);
  const story = stories[0];
  return story ? { story, reason } : null;
}
