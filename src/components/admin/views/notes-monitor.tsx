"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Flag } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState, SkeletonTableShell } from "@/components/admin/admin-skeleton";

interface AdminNote {
  id: string;
  storyId: string;
  storyTitle: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  toWriterId: string;
  toWriterName: string;
  toWriterEmail: string;
  body: string;
  replyBody: string | null;
  repliedAt: string | null;
  reported: boolean;
  reportedAt: string | null;
  pinnedAt: string | null;
  createdAt: string;
}

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "2-digit" });
}

export function NotesMonitor() {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reportedOnly, setReportedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (reportedOnly) params.set("reportedOnly", "true");
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/kekere/notes?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      setNotes(d.notes ?? []);
      setTotalPages(d.totalPages ?? 1);
      setTotal(d.total ?? 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, reportedOnly, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <p className="max-w-[640px] text-[13px] leading-[1.6] text-[#8B919A]">
        A spot-check view of reader-to-writer notes, for confirming the feature stays healthy — not a
        general inbox. Every read here is a deliberate, logged access to a private conversation, so use
        it for oversight, not curiosity.
      </p>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-[340px] sm:flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0A8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search note text, name, or email…"
            className="w-full rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1A1C20] placeholder:text-[#9AA0A8] focus:outline-none focus:ring-1 focus:ring-[#1A1C20]/30"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => { setReportedOnly((v) => !v); setPage(1); }}
            className={cn(
              "flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[12px] font-semibold transition-colors",
              reportedOnly ? "bg-[#C0392B] text-white" : "bg-[rgba(20,22,26,0.06)] text-[#8B919A] hover:text-[#1A1C20]"
            )}
          >
            <Flag size={12} />
            Reported only
          </button>
          <span className="flex-none text-[12px] text-[#8B919A] sm:ml-auto">{total.toLocaleString()} notes</span>
        </div>
      </div>

      {loading ? (
        <SkeletonTableShell rows={6} cols={4} />
      ) : error ? (
        <AdminViewError message={error} onRetry={load} />
      ) : notes.length === 0 ? (
        <AdminEmptyState
          title={reportedOnly ? "No reported notes" : "No notes found"}
          note={search ? `No results for "${search}"` : reportedOnly ? "Nothing's been reported." : "No notes match the selected filter."}
        />
      ) : (
        <>
          <div className="space-y-3">
            {notes.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "rounded-[11px] border bg-white p-4",
                  n.reported ? "border-[#C0392B]/30 bg-[rgba(192,57,43,0.03)]" : "border-[rgba(20,22,26,0.08)]"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[12.5px] text-[#646B73]">
                    <span className="font-semibold text-[#1A1C20]">{n.fromUserName}</span>
                    <span className="mx-1 text-[#9AA0A8]">→</span>
                    <span className="font-semibold text-[#1A1C20]">{n.toWriterName}</span>
                    <span className="mx-1.5 text-[#9AA0A8]">·</span>
                    <span className="text-[#9AA0A8]">on &ldquo;{n.storyTitle}&rdquo;</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {n.reported && (
                      <span className="flex items-center gap-1 rounded-full bg-[#C0392B] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        <Flag size={9} />
                        Reported
                      </span>
                    )}
                    <span className="text-[11px] text-[#9AA0A8]">{relativeTime(n.createdAt)}</span>
                  </div>
                </div>

                <p className="mt-2.5 whitespace-pre-wrap text-[13.5px] leading-[1.55] text-[#1A1C20]">{n.body}</p>

                {n.replyBody && (
                  <div className="mt-2.5 rounded-[8px] bg-[#FBFBFC] p-3">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[#9AA0A8]">
                      {n.toWriterName}&apos;s reply
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[13px] leading-[1.5] text-[#1A1C20]">{n.replyBody}</p>
                  </div>
                )}

                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#9AA0A8]">
                  <span>{n.fromUserEmail}</span>
                  <span>{n.toWriterEmail}</span>
                  {n.pinnedAt && <span className="font-medium text-[#B7791F]">Pinned to praise wall</span>}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-[8px] border border-[rgba(20,22,26,0.14)] px-4 py-2 text-[12px] font-medium text-[#646B73] hover:bg-[#F4F5F7] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-[12px] text-[#8B919A]">Page {page} of {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-[8px] border border-[rgba(20,22,26,0.14)] px-4 py-2 text-[12px] font-medium text-[#646B73] hover:bg-[#F4F5F7] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
