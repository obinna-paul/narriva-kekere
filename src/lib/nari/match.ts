import { NARI_FAQ, type NariFAQEntry } from "@/content/nari-faq";

/**
 * Deliberately simple, auditable matching — not embeddings, not fuzzy
 * search. With ~10 FAQ entries, plain keyword scoring is enough, and it's
 * easy to reason about exactly why a question matched (or didn't). We're
 * optimizing for "never confidently wrong," so any ambiguity falls back
 * rather than guessing.
 */
const MIN_SCORE = 1;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface NariMatchResult {
  entry: NariFAQEntry;
  score: number;
}

export function matchNariFAQ(question: string): NariMatchResult | null {
  const normalized = normalize(question);
  if (!normalized) return null;

  const scored = NARI_FAQ.map((entry) => {
    const score = entry.keywords.reduce(
      (total, keyword) => total + (normalized.includes(keyword.toLowerCase()) ? 1 : 0),
      0
    );
    return { entry, score };
  }).sort((a, b) => b.score - a.score);

  const [best, second] = scored;
  if (!best || best.score < MIN_SCORE) return null;

  // Two entries scoring equally means the question is ambiguous between two
  // topics — better to fall back than guess which one the asker meant.
  if (second && second.score === best.score) return null;

  return best;
}
