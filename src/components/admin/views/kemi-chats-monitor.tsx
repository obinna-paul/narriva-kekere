"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState, SkeletonTableShell } from "@/components/admin/admin-skeleton";

interface KemiConversationSummary {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  messageCount: number;
  lastMessagePreview: string;
  startedAt: string;
  lastMessageAt: string;
}

interface KemiMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "2-digit" });
}

export function KemiChatsMonitor() {
  const [conversations, setConversations] = useState<KemiConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, KemiMessage[]>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/kekere/kemi-chats?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      setConversations(d.conversations ?? []);
      setTotalPages(d.totalPages ?? 1);
      setTotal(d.total ?? 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = useCallback(async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (detail[id]) return;
    setDetailLoadingId(id);
    try {
      const res = await fetch(`/api/admin/kekere/kemi-chats/${id}`);
      if (res.ok) {
        const d = await res.json();
        setDetail((prev) => ({ ...prev, [id]: d.messages ?? [] }));
      }
    } finally {
      setDetailLoadingId(null);
    }
  }, [expandedId, detail]);

  return (
    <div className="space-y-5">
      <p className="max-w-[640px] text-[13px] leading-[1.6] text-[#8B919A]">
        A look at how readers are actually talking to Kemi — for understanding real usage
        patterns, not a moderation queue. Every read here is a deliberate, logged access to a
        reader&apos;s own conversation, so use it for insight, not curiosity.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-[340px] sm:flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0A8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by reader name or email…"
            className="w-full rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1A1C20] placeholder:text-[#9AA0A8] focus:outline-none focus:ring-1 focus:ring-[#1A1C20]/30"
          />
        </div>
        <span className="text-[12px] text-[#8B919A] sm:ml-auto">{total.toLocaleString()} conversations</span>
      </div>

      {loading ? (
        <SkeletonTableShell rows={6} cols={4} />
      ) : error ? (
        <AdminViewError message={error} onRetry={load} />
      ) : conversations.length === 0 ? (
        <AdminEmptyState
          title="No conversations"
          note={search ? `No results for "${search}"` : "No one has chatted with Kemi yet."}
        />
      ) : (
        <>
          <div className="space-y-3">
            {conversations.map((c) => {
              const expanded = expandedId === c.id;
              const messages = detail[c.id];
              return (
                <div key={c.id} className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
                  <button
                    type="button"
                    onClick={() => toggleExpand(c.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[13px] font-semibold text-[#1A1C20]">{c.userName}</span>
                        <span className="flex items-center gap-1 text-[11px] text-[#9AA0A8]">
                          <MessageCircle size={11} />
                          {c.messageCount}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-[#9AA0A8]">{c.userEmail}</p>
                      {!expanded && (
                        <p className="mt-1 line-clamp-1 text-[12.5px] text-[#646B73]">{c.lastMessagePreview}</p>
                      )}
                    </div>
                    <div className="flex flex-none items-center gap-3">
                      <span className="text-[11px] text-[#9AA0A8]">{relativeTime(c.lastMessageAt)}</span>
                      {expanded ? (
                        <ChevronUp size={14} className="text-[#9AA0A8]" />
                      ) : (
                        <ChevronDown size={14} className="text-[#9AA0A8]" />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-[rgba(20,22,26,0.08)] px-4 py-4">
                      {detailLoadingId === c.id && !messages ? (
                        <p className="text-[12px] text-[#9AA0A8]">Loading…</p>
                      ) : (
                        <div className="space-y-2.5">
                          {(messages ?? []).map((m, i) => (
                            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                              <div
                                className={cn(
                                  "max-w-[85%] rounded-[10px] px-3.5 py-2.5 text-[13px] leading-[1.5]",
                                  m.role === "user" ? "bg-[#1A1C20] text-white" : "bg-[#F4F1EC] text-[#1A1C20]"
                                )}
                              >
                                <p className="whitespace-pre-wrap">{m.content}</p>
                                <p className={cn("mt-1 text-[10px]", m.role === "user" ? "text-white/50" : "text-[#9AA0A8]")}>
                                  {m.role === "user" ? c.userName : "Kemi"} ·{" "}
                                  {new Date(m.timestamp).toLocaleString("en-NG", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
