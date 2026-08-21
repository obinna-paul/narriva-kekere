"use client";

import { useState } from "react";
import { X, Send, MoreVertical, Flag, Trash2, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
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
  onPost: (body: string, parentId?: string) => Promise<boolean>;
  pendingNewCount: number;
  onApplyPending: () => void;
  onReportComment: (commentId: string) => void;
  currentUserId: string | null;
  onDeleteComment: (commentId: string, parentId?: string) => Promise<boolean>;
}

/** One comment row — shared by top-level comments and their replies, since
 * both look the same (name, time, body, options menu). Replies just render
 * indented and never get their own "Reply" action, since threads here are
 * deliberately one level deep. */
function CommentRow({
  comment,
  isReply,
  openMenuId,
  setOpenMenuId,
  onReportComment,
  onReply,
  canDelete,
  onDelete,
}: {
  comment: CommentDTO;
  isReply: boolean;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onReportComment: (commentId: string) => void;
  onReply?: () => void;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const c = comment;
  return (
    <div className="group flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-[var(--color-ink)]">
            {c.userDisplayName}
          </span>
          <span className="flex-none text-[11px] text-[var(--color-ink-muted-3)]">
            {formatRelativeTime(c.createdAt)}
          </span>
        </div>
        <div className="relative flex-none">
          <button
            type="button"
            aria-label="Comment options"
            onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
            className="text-[var(--color-ink-muted-3)] opacity-0 transition-opacity hover:text-[var(--color-ink)] focus-visible:opacity-100 group-hover:opacity-100"
          >
            <MoreVertical size={14} />
          </button>
          {openMenuId === c.id && (
            <>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => setOpenMenuId(null)}
                className="fixed inset-0 z-40 cursor-default bg-none"
                style={{ background: "none", border: "none" }}
              />
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1 w-[150px] rounded-[10px] border border-[var(--color-ink)]/10 bg-[var(--color-bg)] p-1 shadow-[0_16px_40px_-14px_rgba(42,26,18,0.35)]"
              >
                {canDelete ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpenMenuId(null);
                      onDelete();
                    }}
                    className="flex w-full items-center gap-2 rounded-[7px] px-2 py-[7px] text-left text-[12.5px] font-medium text-[var(--color-danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)]"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    <Trash2 size={13} className="flex-none" />
                    Delete
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpenMenuId(null);
                      onReportComment(c.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-[7px] px-2 py-[7px] text-left text-[12.5px] font-medium text-[var(--color-danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)]"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    <Flag size={13} className="flex-none" />
                    Report
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <p className="text-[13.5px] leading-snug text-[var(--color-ink)]/85">{c.body}</p>
      {!isReply && onReply && (
        <button
          type="button"
          onClick={onReply}
          className="self-start text-[12px] font-semibold text-[var(--color-ink-muted-2)] transition-colors hover:text-[var(--color-primary)]"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          Reply
        </button>
      )}
    </div>
  );
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
  onReportComment,
  currentUserId,
  onDeleteComment,
}: CommentPanelProps) {
  const [draft, setDraft] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  if (!open) return null;

  async function handlePost() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed.length > BODY_LIMIT) return;
    const ok = await onPost(trimmed);
    if (ok) setDraft("");
  }

  async function handlePostReply(parentId: string) {
    const trimmed = replyDraft.trim();
    if (!trimmed || trimmed.length > BODY_LIMIT) return;
    const ok = await onPost(trimmed, parentId);
    if (ok) {
      setReplyDraft("");
      setReplyingToId(null);
    }
  }

  const canPost = draft.trim().length > 0 && draft.length <= BODY_LIMIT;
  const canPostReply = replyDraft.trim().length > 0 && replyDraft.length <= BODY_LIMIT;

  return (
    <>
      {/* Mobile: dims the story text behind the bottom sheet.
          pointer-events-none so taps pass through to story paragraphs —
          users close the panel with the X button instead. */}
      <div className="pointer-events-none fixed inset-0 z-40 bg-[var(--color-ink)]/30 md:hidden" aria-hidden="true" />

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
                <li key={c.id} className="flex flex-col gap-3">
                  <CommentRow
                    comment={c}
                    isReply={false}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    onReportComment={onReportComment}
                    onReply={() => {
                      setReplyingToId(replyingToId === c.id ? null : c.id);
                      setReplyDraft("");
                    }}
                    canDelete={!!currentUserId && c.userId === currentUserId}
                    onDelete={() => onDeleteComment(c.id)}
                  />

                  {c.replies.length > 0 && (
                    <ul className="flex flex-col gap-3 border-l-2 border-[var(--color-ink)]/[0.08] pl-3">
                      {c.replies.map((r) => (
                        <li key={r.id}>
                          <CommentRow
                            comment={r}
                            isReply
                            openMenuId={openMenuId}
                            setOpenMenuId={setOpenMenuId}
                            onReportComment={onReportComment}
                            canDelete={!!currentUserId && r.userId === currentUserId}
                            onDelete={() => onDeleteComment(r.id, c.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}

                  {replyingToId === c.id && (
                    <div className="ml-3 flex flex-col gap-1.5 border-l-2 border-[var(--color-ink)]/[0.08] pl-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-muted-3)]">
                        <CornerDownRight size={12} />
                        Replying to {c.userDisplayName}
                      </div>
                      <textarea
                        autoFocus
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        placeholder="Write a reply..."
                        rows={2}
                        maxLength={BODY_LIMIT + 50}
                        className="w-full resize-none rounded-lg border border-[var(--color-ink)]/15 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyDraft("");
                          }}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-muted-2)] transition-colors hover:text-[var(--color-ink)]"
                          style={{ background: "none", border: "none", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!canPostReply || posting}
                          onClick={() => handlePostReply(c.id)}
                          className="flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-40"
                        >
                          <Send size={12} />
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
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
                {error && <p className="mb-2 text-xs text-[var(--color-danger)]">{error}</p>}
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
                      draft.length > BODY_LIMIT ? "text-[var(--color-danger)]" : "text-[var(--color-ink-muted-3)]"
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
