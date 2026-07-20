"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState, SkeletonTableShell } from "@/components/admin/admin-skeleton";

type TargetType = "STORY" | "PARAGRAPH_COMMENT";
type Reason = "PLAGIARISM" | "HATE_SPEECH" | "SEXUAL_CONTENT" | "MISTAGGED" | "BROKEN" | "SPAM" | "OTHER";
type Status = "OPEN" | "RESOLVED" | "DISMISSED";

interface ReportTarget {
  type: TargetType;
  storyId: string;
  title?: string;
  authorName: string;
  commentId?: string;
  storyTitle?: string;
  body?: string;
}

interface ReportItem {
  id: string;
  targetType: TargetType;
  reason: Reason;
  details: string | null;
  status: Status;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  reporterName: string;
  reporterEmail: string;
  target: ReportTarget | null;
}

const REASON_LABELS: Record<Reason, string> = {
  PLAGIARISM: "Plagiarism / stolen work",
  HATE_SPEECH: "Hate speech or harassment",
  SEXUAL_CONTENT: "Sexual or explicit content",
  MISTAGGED: "Mis-tagged or misleading",
  BROKEN: "Broken / not displaying right",
  SPAM: "Spam",
  OTHER: "Other",
};

const REASON_STYLES: Record<Reason, string> = {
  PLAGIARISM: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
  HATE_SPEECH: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
  SEXUAL_CONTENT: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
  MISTAGGED: "bg-[rgba(183,121,31,0.10)] text-[#B7791F]",
  BROKEN: "bg-[rgba(183,121,31,0.10)] text-[#B7791F]",
  SPAM: "bg-[rgba(20,22,26,0.08)] text-[#646B73]",
  OTHER: "bg-[rgba(20,22,26,0.08)] text-[#646B73]",
};

type Action = "resolve" | "dismiss" | "delete-comment";

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export function ReportsQueue() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status>("OPEN");
  const [acting, setActing] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ item: ReportItem; action: Action } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: filter });
      const res = await fetch(`/api/admin/kekere/reports?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      setItems(d.reports ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  function showToast(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function act(item: ReportItem, action: Action, notes: string) {
    setActing(item.id);
    try {
      if (action === "delete-comment") {
        if (!item.target || item.target.type !== "PARAGRAPH_COMMENT" || !item.target.commentId) {
          throw new Error("Comment already removed");
        }
        const delRes = await fetch(
          `/api/kekere/stories/${item.target.storyId}/comments/${item.target.commentId}`,
          { method: "DELETE" }
        );
        if (!delRes.ok) {
          const d = await delRes.json().catch(() => null);
          throw new Error(d?.error ?? "Couldn't delete the comment");
        }
      }

      const resolveAction = action === "dismiss" ? "dismiss" : "resolve";
      const defaultNote = action === "delete-comment" ? "Comment deleted." : undefined;
      const res = await fetch(`/api/admin/kekere/reports/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: resolveAction, notes: notes.trim() || defaultNote }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Action failed");

      setItems((prev) => prev.filter((r) => r.id !== item.id));
      const messages: Record<Action, string> = {
        resolve: "Report resolved.",
        dismiss: "Report dismissed.",
        "delete-comment": "Comment deleted and report resolved.",
      };
      showToast("ok", messages[action]);
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Action failed. Try again.");
    } finally {
      setActing(null);
      setActionModal(null);
      setNoteText("");
    }
  }

  const FILTERS: Status[] = ["OPEN", "RESOLVED", "DISMISSED"];

  const modalCopy: Record<Action, { title: string; desc: string; confirmLabel: string; confirmClass: string }> = {
    resolve: {
      title: "Resolve report",
      desc: "Marks this report handled — use this once you've taken action outside this queue (e.g. edited or unpublished the story).",
      confirmLabel: "Resolve",
      confirmClass: "bg-[#1F8A5B] hover:bg-[#1a7a50]",
    },
    dismiss: {
      title: "Dismiss report",
      desc: "Marks this report as not requiring action — nothing else changes.",
      confirmLabel: "Dismiss",
      confirmClass: "bg-[#646B73]",
    },
    "delete-comment": {
      title: "Delete comment & resolve",
      desc: "Permanently removes this comment from the story, then marks the report resolved.",
      confirmLabel: "Delete comment",
      confirmClass: "bg-[#C0392B]",
    },
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={cn(
            "fixed right-6 top-6 z-50 rounded-[8px] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg",
            toast.type === "ok" ? "bg-[#1F8A5B]" : "bg-[#C0392B]"
          )}
        >
          {toast.msg}
        </div>
      )}

      {actionModal && (() => {
        const copy = modalCopy[actionModal.action];
        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(20,22,26,0.4)] backdrop-blur-sm">
            <div className="w-[440px] rounded-[13px] bg-white p-6 shadow-xl">
              <h3 className="text-[15px] font-semibold text-[#1A1C20]">{copy.title}</h3>
              <p className="mt-1 text-[13px] text-[#8B919A]">{copy.desc}</p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note (optional)…"
                rows={3}
                className="mt-4 w-full resize-none rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-[#F4F5F7] px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#1A1C20]/30"
              />
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setActionModal(null); setNoteText(""); }}
                  className="flex-1 rounded-[8px] border border-[rgba(20,22,26,0.14)] py-2.5 text-[13px] font-medium text-[#646B73] hover:bg-[#F4F5F7]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!acting}
                  onClick={() => act(actionModal.item, actionModal.action, noteText)}
                  className={cn(
                    "flex-1 rounded-[8px] py-2.5 text-[13px] font-semibold text-white disabled:opacity-40",
                    copy.confirmClass
                  )}
                >
                  {acting ? "Working…" : copy.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Filter tabs */}
      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-[9px] bg-[rgba(20,22,26,0.06)] p-[3px]">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "flex-none whitespace-nowrap px-4 py-2 text-[12px] font-semibold capitalize rounded-[7px] transition-colors",
              filter === f ? "bg-white text-[#1A1C20] shadow-sm" : "text-[#8B919A] hover:text-[#1A1C20]"
            )}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonTableShell rows={5} cols={4} />
      ) : error ? (
        <AdminViewError message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <AdminEmptyState
          title={`No ${filter.toLowerCase()} reports`}
          note={filter === "OPEN" ? "All clear here — nothing waiting on you." : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase", REASON_STYLES[r.reason])}>
                      {REASON_LABELS[r.reason]}
                    </span>
                    <span className="rounded-full bg-[rgba(20,22,26,0.06)] px-2.5 py-1 text-[10px] font-bold uppercase text-[#646B73]">
                      {r.targetType === "STORY" ? "Story" : "Comment"}
                    </span>
                  </div>

                  {r.target ? (
                    r.target.type === "STORY" ? (
                      <p className="mt-2 text-[14px] font-semibold text-[#1A1C20]">
                        <Link href={`/admin/kekere/stories/${r.target.storyId}/edit`} className="hover:underline">
                          {r.target.title}
                        </Link>
                        <span className="ml-1.5 font-normal text-[#8B919A]">by {r.target.authorName}</span>
                      </p>
                    ) : (
                      <div className="mt-2">
                        <p className="text-[12px] text-[#8B919A]">
                          Comment on{" "}
                          <Link href={`/admin/kekere/stories/${r.target.storyId}/edit`} className="font-medium text-[#1A1C20] hover:underline">
                            {r.target.storyTitle}
                          </Link>
                          {" "}by {r.target.authorName}
                        </p>
                        <p className="mt-1 rounded-[8px] bg-[#F4F5F7] px-3 py-2 text-[13px] text-[#1A1C20]">
                          &ldquo;{r.target.body}&rdquo;
                        </p>
                      </div>
                    )
                  ) : (
                    <p className="mt-2 text-[13px] italic text-[#9AA0A8]">Content removed since this was filed.</p>
                  )}

                  {r.details && (
                    <p className="mt-2 text-[13px] text-[#646B73]">
                      <span className="font-semibold text-[#1A1C20]">Reporter&apos;s note:</span> {r.details}
                    </p>
                  )}

                  <p className="mt-2 text-[11px] text-[#9AA0A8]">
                    Reported by {r.reporterName} ({r.reporterEmail}) · {relativeTime(r.createdAt)}
                  </p>

                  {r.status !== "OPEN" && (
                    <p className="mt-1 text-[11px] text-[#9AA0A8]">
                      {r.status === "RESOLVED" ? "Resolved" : "Dismissed"} {r.resolvedAt ? relativeTime(r.resolvedAt) : ""}
                      {r.resolutionNotes ? ` — ${r.resolutionNotes}` : ""}
                    </p>
                  )}
                </div>

                {r.status === "OPEN" && (
                  <div className="flex flex-none flex-wrap items-center justify-end gap-2">
                    {r.targetType === "PARAGRAPH_COMMENT" && r.target && (
                      <button
                        type="button"
                        disabled={acting === r.id}
                        onClick={() => { setActionModal({ item: r, action: "delete-comment" }); setNoteText(""); }}
                        className="rounded-[7px] border border-[#C0392B]/30 px-3 py-1.5 text-[11px] font-medium text-[#C0392B] hover:bg-[rgba(192,57,43,0.06)] disabled:opacity-40"
                      >
                        Delete comment
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => { setActionModal({ item: r, action: "resolve" }); setNoteText(""); }}
                      className="rounded-[7px] bg-[#1F8A5B] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1a7a50] disabled:opacity-40"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => { setActionModal({ item: r, action: "dismiss" }); setNoteText(""); }}
                      className="rounded-[7px] border border-[rgba(20,22,26,0.14)] px-3 py-1.5 text-[11px] font-medium text-[#646B73] hover:bg-[#F4F5F7] disabled:opacity-40"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
