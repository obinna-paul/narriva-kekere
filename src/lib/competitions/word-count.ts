/**
 * Shared between the server (submitStoryToCompetition's validation) and the
 * client (CompetitionApply's draft picker, which needs to disable an
 * over-limit draft using the exact same rule the server will enforce) — a
 * story shouldn't be shown as pickable only to fail on submit.
 */

// Word counts are a guideline, not a hard cutoff — a stated 1,000-word limit
// still accepts a 1,200-word story. Applied symmetrically to both ends of a
// min/max range.
export const WORD_COUNT_TOLERANCE = 0.2;

export function wordCountRangeLabel(min: number | null | undefined, max: number): string {
  return min ? `${min.toLocaleString()}-${max.toLocaleString()}` : `up to ${max.toLocaleString()}`;
}

export function isWordCountEligible(
  wordCount: number,
  min: number | null | undefined,
  max: number
): boolean {
  const effectiveMax = Math.ceil(max * (1 + WORD_COUNT_TOLERANCE));
  if (wordCount > effectiveMax) return false;

  if (min) {
    const effectiveMin = Math.floor(min * (1 - WORD_COUNT_TOLERANCE));
    if (wordCount < effectiveMin) return false;
  }

  return true;
}
