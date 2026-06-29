"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { EmojiPicker } from "@/components/kekere/EmojiPicker";
import type { CommentDTO } from "@/components/kekere/use-paragraph-comments";

const BODY_LIMIT = 500;

function formatRelativeTime(iso: string): string {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export interface CommentPanelProps {
  open: boolean;
  onClose: () => void;
  selectedParagraphId: string | null;
  comments: CommentDTO[] | undefined;
  unlocked: boolean;
  posting: boolean;
  error: string | null;
  onPost: (body: string) => Promise<boolean>;
  pendingNewCount: number;
  onApplyPending: () => void;
  userReaction: string | null;
  onSelectEmoji: (emoji: string) => void;
  onRemoveEmoji: () => void;
}

export function CommentPanel({
  open,
  onClose,
  selectedParagraphId,
  comments,
  unlocked,
  posting,
  error,
  onPost,
  pendingNewCount,
  onApplyPending,
  userReaction,
  onSelectEmoji,
  onRemoveEmoji,
}: CommentPanelProps) {
  const [draft, setDraft] = useState("");

  if (!open) return null;

  async function handlePost() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed.length > BODY_LIMIT) return;
    const ok = await onPost(trimmed);
    if (ok) setDraft("");
  }

  const canPost = draft.trim().length > 0 && draft.length <= BODY_LIMIT;

  return (
    <>
      {/* Mobile: dims the story text behind the bottom sheet. */}
      <div className="fixed inset-0 z-40 bg-[var(--color-ink)]/30 md:hidden" onClick={onClose} aria-hidden="true" />

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[75vh] flex-col rounded-t-[20px] bg-[var(--color-bg)] shadow-[0_-18px_50px_-20px_rgba(42,26,18,0.4)]",
          "md:sticky md:inset-x-auto md:bottom-auto md:top-[88px] md:h-[calc(100vh-110px)] md:max-h-none md:w-[320px] md:flex-none md:rounded-2xl md:border md:border-[var(--color-ink)]/10 md:shadow-none"
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-ink)]/[0.08] px-5 py-4">
          <span className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-[var(--color-ink)]">
            Comments
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            className="text-[var(--color-ink-muted-2)] hover:text-[var(--color-ink)]"
          >
            <X size={18} />
          </button>
        </div>

        {pendingNewCount > 0 && (
          <button
            type="button"
            onClick={onApplyPending}
            className="border-b border-[var(--color-ink)]/[0.08] bg-[var(--color-primary-muted)] px-5 py-2.5 text-center text-xs font-semibold text-[var(--color-primary)]"
          >
            {pendingNewCount} new comment{pendingNewCount === 1 ? "" : "s"} — Load new comments
          </button>
        )}

        {selectedParagraphId && unlocked && (
          <div className="border-b border-[var(--color-ink)]/[0.08] px-5 py-3">
            <EmojiPicker userReaction={userReaction} onSelect={onSelectEmoji} onRemove={onRemoveEmoji} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!selectedParagraphId && (
            <p className="text-sm text-[var(--color-ink-muted-2)]">
              Click on any paragraph to see its comments.
            </p>
          )}

          {selectedParagraphId && (!comments || comments.length === 0) && (
            <p className="text-sm text-[var(--color-ink-muted-2)]">
              No comments on this paragraph yet. Be the first.
            </p>
          )}

          {selectedParagraphId && comments && comments.length > 0 && (
            <ul className="flex flex-col gap-4">
              {comments.map((c) => (
                <li key={c.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[var(--color-ink)]">
                      {c.userDisplayName}
                    </span>
                    <span className="text-[11px] text-[var(--color-ink-muted-3)]">
                      {formatRelativeTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13.5px] leading-snug text-[var(--color-ink)]/85">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedParagraphId && (
          <div className="border-t border-[var(--color-ink)]/[0.08] p-4">
            {!unlocked ? (
              <p className="text-center text-xs text-[var(--color-ink-muted-2)]">
                Unlock this story to leave comments.
              </p>
            ) : (
              <>
                {error && <p className="mb-2 text-xs text-[#A13A3A]">{error}</p>}
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  maxLength={BODY_LIMIT + 50}
                  className="w-full resize-none rounded-lg border border-[var(--color-ink)]/15 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[11px]",
                      draft.length > BODY_LIMIT ? "text-[#A13A3A]" : "text-[var(--color-ink-muted-3)]"
                    )}
                  >
                    {draft.length}/{BODY_LIMIT}
                  </span>
                  <button
                    type="button"
                    disabled={!canPost || posting}
                    onClick={handlePost}
                    className="flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-40"
                  >
                    <Send size={12} />
                    Post
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
