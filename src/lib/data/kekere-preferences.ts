import { prisma } from "@/lib/db/prisma";
import { getUserTagScores, rollUpTagScoresToCategoryScores } from "@/lib/data/kekere-taste";
import { STORY_TAGS, type StoryTagSlug } from "@/content/story-tags";

const VALID_TAG_SLUGS = new Set<string>(STORY_TAGS.map((t) => t.slug));

/** How many auto-detected tags to surface on the Preferences page — enough
 *  to read as a real picture of taste, not so many it stops looking curated. */
const MAX_AUTO_DETECTED = 8;

export interface UserTagPreferences {
  /** What the reader explicitly chose on the Preferences page. Empty means
   *  never set — the feed falls back to pure inference (kekere-taste.ts),
   *  and the Preferences page shows the auto-detected summary instead of a
   *  pre-checked picker. */
  explicit: StoryTagSlug[];
  /** Top tags inferred from reading signal (completions, high ratings,
   *  saves, unlocks, in-progress reads), independent of whether explicit
   *  preferences are set — powers the "we think you prefer stories with
   *  these tags" summary, and pre-checks the picker when a reader opens it
   *  to edit for the first time. */
  autoDetected: StoryTagSlug[];
  /** Per-category affinity rolled up from the same tag scores autoDetected is
   *  built from — exposed so callers with their own use for a category-level
   *  view (feed/page.tsx's row ordering and within-row ranking) don't need a
   *  second, separately expensive getUserTagScores computation. Never sent
   *  over the wire (see the API route) — server-side use only. */
  categoryScores: Map<string, number>;
}

export async function getUserTagPreferences(userId: string): Promise<UserTagPreferences> {
  const [user, tagScores] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { preferredTagSlugs: true } }),
    getUserTagScores(userId),
  ]);

  const autoDetected = Array.from(tagScores.entries())
    .filter(([slug, score]) => score > 0 && VALID_TAG_SLUGS.has(slug))
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_AUTO_DETECTED)
    .map(([slug]) => slug as StoryTagSlug);

  return {
    explicit: (user?.preferredTagSlugs ?? []).filter((slug) => VALID_TAG_SLUGS.has(slug)) as StoryTagSlug[],
    autoDetected,
    categoryScores: rollUpTagScoresToCategoryScores(tagScores),
  };
}

/** Overwrites the reader's explicit preferences outright — not a merge.
 *  Silently drops anything that isn't a real current tag slug (a stale
 *  client, a retired tag) rather than rejecting the whole request over it. */
export async function setUserTagPreferences(userId: string, tagSlugs: string[]): Promise<StoryTagSlug[]> {
  const deduped = Array.from(new Set(tagSlugs)).filter((slug) => VALID_TAG_SLUGS.has(slug)) as StoryTagSlug[];
  await prisma.user.update({ where: { id: userId }, data: { preferredTagSlugs: deduped } });
  return deduped;
}
