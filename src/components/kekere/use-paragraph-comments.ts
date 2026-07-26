"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 30000;

export interface CommentDTO {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatar: string | null;
  body: string;
  createdAt: string;
  replies: CommentDTO[];
}

interface ParagraphCommentGroup {
  count: number;
  comments: CommentDTO[];
  loadMore: boolean;
}

type CommentsByParagraph = Record<string, ParagraphCommentGroup>;

export function useParagraphComments(storyId: string, canFetch: boolean) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | null>(null);
  const [commentsByParagraph, setCommentsByParagraph] = useState<CommentsByParagraph>({});
  const [pendingByParagraph, setPendingByParagraph] = useState<CommentsByParagraph>({});
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastKnownTotal = useRef(0);
  const skipNextAutoApply = useRef(false);

  const totalCount = useCallback((data: CommentsByParagraph) =>
    Object.values(data).reduce((sum, g) => sum + g.count, 0), []);

  const fetchComments = useCallback(
    async (apply: "immediate" | "stage") => {
      if (!canFetch) return;
      try {
        const res = await fetch(`/api/kekere/stories/${storyId}/comments`);
        if (!res.ok) return;
        const data: CommentsByParagraph = await res.json();

        if (apply === "immediate" || lastKnownTotal.current === 0) {
          setCommentsByParagraph(data);
          setPendingByParagraph({});
          lastKnownTotal.current = totalCount(data);
          return;
        }

        // Don't yank comments in/out from under a reader mid-read — stage
        // new arrivals behind a "X new comments" banner instead.
        const incomingTotal = totalCount(data);
        if (incomingTotal > lastKnownTotal.current) {
          setPendingByParagraph(data);
        }
      } catch {
        // Polling is best-effort.
      }
    },
    [canFetch, storyId, totalCount]
  );

  useEffect(() => {
    if (!canFetch) return;
    fetchComments("immediate");
    const interval = setInterval(() => fetchComments("stage"), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [canFetch, fetchComments]);

  function applyPending() {
    setCommentsByParagraph(pendingByParagraph);
    lastKnownTotal.current = totalCount(pendingByParagraph);
    setPendingByParagraph({});
  }

  const pendingNewCount = Object.keys(pendingByParagraph).length > 0
    ? totalCount(pendingByParagraph) - lastKnownTotal.current
    : 0;

  // Selecting a paragraph (clicking its text) highlights it and is enough
  // to react to it — it does NOT force the panel open on its own; only
  // the header toggle button or explicitly opening comments does that
  // (see openComments below), so closed-panel reacting via the floating
  // picker stays reachable.
  function selectParagraph(paragraphId: string) {
    setSelectedParagraphId(paragraphId);
  }

  function openComments(paragraphId: string) {
    setSelectedParagraphId(paragraphId);
    setPanelOpen(true);
  }

  function deselect() {
    setSelectedParagraphId(null);
  }

  /** Applies `update` to a specific top-level comment within the selected
   * paragraph's group — shared by the optimistic-insert/replace/rollback
   * steps below so a reply only ever touches its own parent's `replies`
   * array, never the rest of the group. `countDelta` keeps the paragraph's
   * `count` (top-level + replies, matching the server's own tally) in sync
   * with a reply appearing/disappearing — otherwise the margin comment-count
   * badge would silently under-count until the next poll. */
  function updateComment(
    paragraphId: string,
    commentId: string,
    update: (c: CommentDTO) => CommentDTO,
    countDelta = 0
  ) {
    setCommentsByParagraph((prev) => {
      const group = prev[paragraphId];
      if (!group) return prev;
      return {
        ...prev,
        [paragraphId]: {
          ...group,
          count: group.count + countDelta,
          comments: group.comments.map((c) => (c.id === commentId ? update(c) : c)),
        },
      };
    });
  }

  async function postComment(body: string, parentId?: string): Promise<boolean> {
    if (!selectedParagraphId) return false;
    setPosting(true);
    setError(null);

    // Optimistic insert.
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticComment: CommentDTO = {
      id: optimisticId,
      userId: "me",
      userDisplayName: "You",
      userAvatar: null,
      body,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    if (parentId) {
      updateComment(
        selectedParagraphId,
        parentId,
        (c) => ({ ...c, replies: [...c.replies, optimisticComment] }),
        1
      );
    } else {
      setCommentsByParagraph((prev) => {
        const group = prev[selectedParagraphId] ?? { count: 0, comments: [], loadMore: false };
        return {
          ...prev,
          [selectedParagraphId]: {
            ...group,
            count: group.count + 1,
            comments: [...group.comments, optimisticComment],
          },
        };
      });
    }

    try {
      const res = await fetch(`/api/kekere/stories/${storyId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraphId: selectedParagraphId, body, parentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't post your comment.");
      }
      const { comment } = await res.json();

      // Replace the optimistic entry with the server-confirmed one.
      if (parentId) {
        updateComment(selectedParagraphId, parentId, (c) => ({
          ...c,
          replies: c.replies.map((r) => (r.id === optimisticId ? comment : r)),
        }));
      } else {
        setCommentsByParagraph((prev) => {
          const group = prev[selectedParagraphId];
          if (!group) return prev;
          return {
            ...prev,
            [selectedParagraphId]: {
              ...group,
              comments: group.comments.map((c) => (c.id === optimisticId ? comment : c)),
            },
          };
        });
      }
      lastKnownTotal.current += 1;
      return true;
    } catch (err) {
      // Roll back the optimistic insert.
      if (parentId) {
        updateComment(
          selectedParagraphId,
          parentId,
          (c) => ({ ...c, replies: c.replies.filter((r) => r.id !== optimisticId) }),
          -1
        );
      } else {
        setCommentsByParagraph((prev) => {
          const group = prev[selectedParagraphId];
          if (!group) return prev;
          return {
            ...prev,
            [selectedParagraphId]: {
              ...group,
              count: group.count - 1,
              comments: group.comments.filter((c) => c.id !== optimisticId),
            },
          };
        });
      }
      setError(err instanceof Error ? err.message : "Couldn't post your comment.");
      return false;
    } finally {
      setPosting(false);
    }
  }

  return {
    panelOpen,
    setPanelOpen,
    selectedParagraphId,
    selectParagraph,
    openComments,
    deselect,
    commentsByParagraph,
    selectedGroup: selectedParagraphId ? commentsByParagraph[selectedParagraphId] : undefined,
    posting,
    error,
    postComment,
    pendingNewCount,
    applyPending,
  };
}
