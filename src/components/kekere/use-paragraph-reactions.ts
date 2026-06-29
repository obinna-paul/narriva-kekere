"use client";

import { useCallback, useEffect, useState } from "react";

export interface ParagraphReactionSummary {
  top: { emoji: string; count: number }[];
  userReaction: string | null;
  totalCount: number;
}

type ReactionsByParagraph = Record<string, ParagraphReactionSummary>;

export function useParagraphReactions(storyId: string, canFetch: boolean) {
  const [reactionsByParagraph, setReactionsByParagraph] = useState<ReactionsByParagraph>({});

  const fetchReactions = useCallback(async () => {
    if (!canFetch) return;
    try {
      const res = await fetch(`/api/kekere/stories/${storyId}/reactions`);
      if (!res.ok) return;
      setReactionsByParagraph(await res.json());
    } catch {
      // Best-effort — the next poll/refresh will catch up.
    }
  }, [canFetch, storyId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  /** Recomputes the top-2 entries for a paragraph from a count map —
   * shared by the optimistic set/remove paths below so the "only top 2
   * float" rule is enforced consistently, not just on the server. */
  function topTwo(counts: Map<string, number>) {
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([emoji, count]) => ({ emoji, count }));
  }

  function countsFor(paragraphId: string, excludeEmoji?: string): Map<string, number> {
    const existing = reactionsByParagraph[paragraphId];
    const counts = new Map<string, number>();
    if (existing) {
      for (const { emoji, count } of existing.top) counts.set(emoji, count);
      // top only ever has 2 entries, but totalCount may include emojis
      // outside the top 2 — those are invisible to optimistic updates
      // until the next real fetch, which is an acceptable approximation.
    }
    if (excludeEmoji !== undefined) {
      counts.set(excludeEmoji, Math.max(0, (counts.get(excludeEmoji) ?? 0) - 1));
      if (counts.get(excludeEmoji) === 0) counts.delete(excludeEmoji);
    }
    return counts;
  }

  async function setReaction(paragraphId: string, emoji: string): Promise<boolean> {
    const previous = reactionsByParagraph[paragraphId];
    const previousUserEmoji = previous?.userReaction ?? undefined;

    // Optimistic update: remove the user's old emoji (if any) from the
    // count, add their new one, recompute top 2.
    const counts = countsFor(paragraphId, previousUserEmoji);
    counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
    const totalDelta = previousUserEmoji ? 0 : 1;

    setReactionsByParagraph((prev) => ({
      ...prev,
      [paragraphId]: {
        top: topTwo(counts),
        userReaction: emoji,
        totalCount: (previous?.totalCount ?? 0) + totalDelta,
      },
    }));

    try {
      const res = await fetch(`/api/kekere/stories/${storyId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraphId, emoji }),
      });
      if (!res.ok) throw new Error("failed");
      return true;
    } catch {
      // Roll back to the last known-good state.
      setReactionsByParagraph((prev) => ({ ...prev, [paragraphId]: previous as ParagraphReactionSummary }));
      return false;
    }
  }

  async function removeReaction(paragraphId: string): Promise<boolean> {
    const previous = reactionsByParagraph[paragraphId];
    if (!previous?.userReaction) return true;

    const counts = countsFor(paragraphId, previous.userReaction);
    setReactionsByParagraph((prev) => ({
      ...prev,
      [paragraphId]: {
        top: topTwo(counts),
        userReaction: null,
        totalCount: Math.max(0, previous.totalCount - 1),
      },
    }));

    try {
      const res = await fetch(`/api/kekere/stories/${storyId}/reactions/${paragraphId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("failed");
      return true;
    } catch {
      setReactionsByParagraph((prev) => ({ ...prev, [paragraphId]: previous }));
      return false;
    }
  }

  return { reactionsByParagraph, setReaction, removeReaction };
}
