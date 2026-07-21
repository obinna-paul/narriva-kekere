import type { Prisma } from "@prisma/client";

const MAX_SLUG_LENGTH = 80;

/** Lowercase, hyphenated, accent-stripped. Never empty — a title that's all
 * punctuation/emoji falls back to "story" rather than producing "". */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents (é → e)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, ""); // the length cut above can leave a dangling hyphen
  return base || "story";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Computes the next free slug for a title within a transaction: the bare
 * slugified title if free, otherwise `${base}-1`, `${base}-2`, ... — the
 * first story with a given title keeps the clean URL, later ones with the
 * same title get numbered. Must run inside the same transaction that writes
 * the slug (see withSlugRetry) so two concurrent publishes can't compute the
 * same candidate.
 */
export async function nextSlugForTitle(tx: Prisma.TransactionClient, title: string): Promise<string> {
  const base = slugify(title);
  // Coarse over-fetch (startsWith), narrowed precisely below — cheap since a
  // single title is never republished thousands of times.
  const candidates = await tx.story.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });

  const exactTaken = candidates.some((c) => c.slug === base);
  if (!exactTaken) return base;

  const suffixPattern = new RegExp(`^${escapeRegExp(base)}-(\\d+)$`);
  let maxN = 0;
  for (const c of candidates) {
    const m = c.slug?.match(suffixPattern);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  return `${base}-${maxN + 1}`;
}

/**
 * Runs `fn` (a full Prisma transaction that computes a slug via
 * nextSlugForTitle and writes it as part of flipping a story to PUBLISHED)
 * with a bounded retry if two publishes race onto the same slug — the loser
 * hits the column's unique constraint (Postgres error P2002) at commit, and
 * a full retry recomputes against the now-updated row set. Publishing is a
 * rare, explicit admin/writer action, not high-concurrency traffic, so a
 * small retry ceiling is plenty.
 */
export async function withSlugRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string } | null)?.code;
      if (code !== "P2002") throw error;
    }
  }
  throw lastError;
}
