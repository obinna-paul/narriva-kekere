import { prisma } from "@/lib/db/prisma";
import { categoryForTag, resolveCategoryBySlug, TAG_BY_SLUG } from "@/content/story-tags";
import { rankStoryIdsByRecentPopularity } from "@/lib/data/kekere-stories";

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

/** Per-category affinity score for a user, rolled up from their weighted
 *  reading signals through each engaged story's tags (see categoryForTag in
 *  story-tags.ts). Empty for a user with no signal yet — callers treat that
 *  as "no personalization, fall back to the editorial default." */
export async function getUserCategoryScores(userId: string): Promise<Map<string, number>> {
  const storyScores = await getWeightedStoryScores(userId);
  if (storyScores.size === 0) return new Map();

  const storyTags = await prisma.storyTag.findMany({
    where: { storyId: { in: Array.from(storyScores.keys()) } },
    select: { storyId: true, tag: { select: { slug: true } } },
  });

  const categoryScores = new Map<string, number>();
  for (const st of storyTags) {
    const weight = storyScores.get(st.storyId) ?? 0;
    if (weight === 0) continue;
    const category = categoryForTag(st.tag.slug);
    categoryScores.set(category.slug, (categoryScores.get(category.slug) ?? 0) + weight);
  }
  return categoryScores;
}

/** Reorders `defaultOrder` by the user's category affinity, highest first.
 *  A stable sort — tags with equal (including zero) score keep their
 *  original editorial position, so a cold-start user with no signal gets
 *  `defaultOrder` back completely unchanged rather than a special case. */
export async function getPersonalizedTagOrder<T extends string>(
  userId: string,
  defaultOrder: readonly T[]
): Promise<T[]> {
  const categoryScores = await getUserCategoryScores(userId);
  if (categoryScores.size === 0) return [...defaultOrder];

  const scoreForTag = (slug: T) => categoryScores.get(categoryForTag(slug).slug) ?? 0;
  return [...defaultOrder]
    .map((slug, index) => ({ slug, index, score: scoreForTag(slug) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.slug);
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
