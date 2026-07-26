"use client";

import { useCallback, useEffect, useState } from "react";
import type { HighlightColorId } from "@/content/highlight-colors";

export interface HighlightRecord {
  id: string;
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  color: string;
  text: string;
}

export interface NewHighlightInput {
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  color: HighlightColorId;
  text: string;
}

/** A reader's own private highlights on a story — fetched once, then
 * mutated optimistically. Never shared with other readers, so unlike
 * comments/reactions there's no polling for other people's activity here. */
export function useHighlights(storyId: string, canFetch: boolean) {
  const [highlights, setHighlights] = useState<HighlightRecord[]>([]);

  const fetchHighlights = useCallback(async () => {
    if (!canFetch) return;
    try {
      const res = await fetch(`/api/kekere/stories/${storyId}/highlights`);
      if (!res.ok) return;
      const data = await res.json();
      setHighlights(data.highlights ?? []);
    } catch {
      // Best-effort — highlighting is a nice-to-have, not core reading
      // functionality, so a failed fetch just means no highlights show up
      // this visit rather than blocking anything.
    }
  }, [canFetch, storyId]);

  useEffect(() => {
    void fetchHighlights();
  }, [fetchHighlights]);

  /** Set when a highlight action failed, so the reader can say so rather
   * than just silently dropping the highlight back out of the page — an
   * optimistic add that rolls back is otherwise indistinguishable from the
   * feature quietly not working. Cleared on the next successful action. */
  const [error, setError] = useState<string | null>(null);

  async function addHighlight(input: NewHighlightInput): Promise<boolean> {
    const tempId = `optimistic-${Date.now()}`;
    setHighlights((prev) => [...prev, { id: tempId, ...input }]);
    setError(null);

    try {
      const res = await fetch(`/api/kekere/stories/${storyId}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const detail = await res
          .json()
          .then((d) => (typeof d?.error === "string" ? d.error : null))
          .catch(() => null);
        throw new Error(detail ? `${res.status} ${detail}` : `${res.status}`);
      }
      const created: HighlightRecord = await res.json();
      setHighlights((prev) => prev.map((h) => (h.id === tempId ? created : h)));
      return true;
    } catch (e) {
      setHighlights((prev) => prev.filter((h) => h.id !== tempId));
      const reason = e instanceof Error && e.message ? e.message : "network";
      setError(`Couldn't save that highlight (${reason}).`);
      return false;
    }
  }

  async function recolorHighlight(highlightId: string, color: HighlightColorId): Promise<boolean> {
    const previous = highlights.find((h) => h.id === highlightId)?.color;
    setHighlights((prev) => prev.map((h) => (h.id === highlightId ? { ...h, color } : h)));

    try {
      const res = await fetch(`/api/kekere/stories/${storyId}/highlights/${highlightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
      if (!res.ok) throw new Error("failed");
      return true;
    } catch {
      if (previous) {
        setHighlights((prev) => prev.map((h) => (h.id === highlightId ? { ...h, color: previous } : h)));
      }
      return false;
    }
  }

  async function removeHighlight(highlightId: string): Promise<boolean> {
    const previous = highlights;
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));

    try {
      const res = await fetch(`/api/kekere/stories/${storyId}/highlights/${highlightId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("failed");
      return true;
    } catch {
      setHighlights(previous);
      return false;
    }
  }

  return { highlights, error, clearError: () => setError(null), addHighlight, recolorHighlight, removeHighlight };
}
