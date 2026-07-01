"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState, SkeletonTableShell } from "@/components/admin/admin-skeleton";

interface Submission {
  id: string;
  manuscriptTitle: string;
  authorName: string;
  email: string;
  genre: string;
  wordCount: number | null;
  serviceType: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "UNDER_REVIEW" | "ON_HOLD";
  submittedAt: string;
  reviewedAt: string | null;
  notes: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[rgba(183,121,31,0.10)] text-[#B7791F]",
  ACCEPTED: "bg-[rgba(31,138,91,0.10)] text-[#1F8A5B]",
  REJECTED: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
  UNDER_REVIEW: "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]",
  ON_HOLD: "bg-[rgba(20,22,26,0.07)] text-[#646B73]",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "2-digit" });
}

export function SubmissionsView() {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("PENDING");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: filter });
      const res = await fetch(`/api/admin/narriva/submissions?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      setItems(d.submissions ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function showToast(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function accept(id: string) {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/narriva/submissions/${id}/accept`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      setItems((prev) => prev.map((s) => s.id === id ? { ...s, status: "ACCEPTED" as const } : s));
      showToast("ok", "Submission accepted. Author project created.");
    } catch {
      showToast("err", "Failed to accept submission.");
    } finally {
      setActing(null);
    }
  }

  const FILTERS = ["PENDING", "UNDER_REVIEW", "ON_HOLD", "ACCEPTED", "REJECTED"];

  return (
    <div className="space-y-5">
      {toast && (
        <div className={cn("fixed right-6 top-6 z-50 rounded-[8px] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg", toast.type === "ok" ? "bg-[#1F8A5B]" : "bg-[#C0392B]")}>
          {toast.msg}
        </div>
      )}

      <div className="flex gap-1 rounded-[9px] bg-[rgba(20,22,26,0.06)] p-[3px] w-fit">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn("px-3.5 py-2 text-[12px] font-semibold rounded-[7px] capitalize transition-colors", filter === f ? "bg-white text-[#1A1C20] shadow-sm" : "text-[#8B919A] hover:text-[#1A1C20]")}
          >
            {f.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonTableShell rows={6} cols={5} />
      ) : error ? (
        <AdminViewError message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <AdminEmptyState title="No submissions" note={`No ${filter.toLowerCase().replace("_", " ")} submissions.`} />
      ) : (
        <div className="overflow-hidden rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
          <div className="grid grid-cols-[2fr_2fr_1fr_0.8fr_0.8fr_auto] items-center gap-4 border-b border-[rgba(20,22,26,0.08)] bg-[#FBFBFC] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">
            <span>Title</span>
            <span>Author</span>
            <span>Service</span>
            <span>Status</span>
            <span>Submitted</span>
            <span className="text-right">Actions</span>
          </div>

          {items.map((s) => (
            <div key={s.id}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                className="grid w-full grid-cols-[2fr_2fr_1fr_0.8fr_0.8fr_auto] items-center gap-4 border-b border-[rgba(20,22,26,0.05)] px-5 py-4 text-left last:border-0 hover:bg-[#FBFBFC]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#1A1C20]">{s.manuscriptTitle}</p>
                  {s.wordCount && <p className="text-[11px] text-[#8B919A]">{s.wordCount.toLocaleString()} words</p>}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-[#1A1C20]">{s.authorName}</p>
                  <p className="truncate text-[11px] text-[#8B919A]">{s.email}</p>
                </div>
                <span className="truncate text-[12px] text-[#646B73]">{s.serviceType ?? s.genre ?? "—"}</span>
                <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase w-fit", STATUS_STYLES[s.status] ?? STATUS_STYLES.PENDING)}>
                  {s.status.replace("_", " ")}
                </span>
                <span className="text-[12px] text-[#8B919A]">{fmtDate(s.submittedAt)}</span>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {s.status === "PENDING" || s.status === "UNDER_REVIEW" ? (
                    <button
                      type="button"
                      disabled={acting === s.id}
                      onClick={() => accept(s.id)}
                      className="rounded-[7px] bg-[#1F8A5B] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1a7a50] disabled:opacity-40"
                    >
                      {acting === s.id ? "…" : "Accept"}
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#9AA0A8]">{s.reviewedAt ? fmtDate(s.reviewedAt) : "—"}</span>
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {expanded === s.id && (
                <div className="border-b border-[rgba(20,22,26,0.05)] bg-[#FAFAFA] px-5 py-4 last:border-0">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">Genre</p>
                      <p className="mt-1 text-[13px] text-[#1A1C20]">{s.genre ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">Word count</p>
                      <p className="mt-1 text-[13px] text-[#1A1C20]">{s.wordCount?.toLocaleString() ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">Service requested</p>
                      <p className="mt-1 text-[13px] text-[#1A1C20]">{s.serviceType ?? "—"}</p>
                    </div>
                    {s.notes && (
                      <div className="col-span-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">Notes from author</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-[#646B73]">{s.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
