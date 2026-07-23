"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Pencil, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StoryRow {
  id: string;
  title: string;
  status: string;
  tier: string;
  hasCover: boolean;
  updatedAt: string;
  authorName: string;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-[rgba(20,22,26,0.07)] text-[#646B73]",
  SUBMITTED: "bg-[rgba(183,121,31,0.12)] text-[#B7791F]",
  REVIEWING: "bg-[rgba(183,121,31,0.12)] text-[#B7791F]",
  REVISIONS_REQUESTED: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
  PENDING_CONTRACT: "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]",
  PUBLISHED: "bg-[rgba(31,138,91,0.12)] text-[#1F8A5B]",
  REJECTED: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
  CHANGES_PROPOSED: "bg-[rgba(199,122,30,0.12)] text-[#A8690F]",
  ACCEPTED: "bg-[rgba(31,138,91,0.08)] text-[#1F8A5B]",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "REVIEWING", label: "Reviewing" },
  { value: "REVISIONS_REQUESTED", label: "Revisions requested" },
  { value: "PENDING_CONTRACT", label: "Pending contract" },
  { value: "CHANGES_PROPOSED", label: "Edits proposed" },
  { value: "ACCEPTED", label: "Accepted — in publishing queue" },
  { value: "PUBLISHED", label: "Published" },
  { value: "REJECTED", label: "Rejected" },
];

export function AllStories() {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/kekere/stories?${params.toString()}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setStories(data.stories ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } catch {
      setError("Couldn't load stories.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search typing
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { setPage(1); }, [search, status]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[18px] font-bold text-[#15171C]">All Stories</h1>
        <p className="mt-1 text-[13px] text-[#7C828C]">
          Every story on Kekere, whatever stage it&rsquo;s at. Open any of them to edit content,
          tags, or the cover — changes to a published story go live on the feed immediately.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-[320px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0A8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or author…"
            className="w-full rounded-[9px] border border-[rgba(20,22,26,0.12)] bg-white py-2 pl-8 pr-3 text-[13px] text-[#15171C] placeholder:text-[#B0B5BD] focus:border-[#C75D2C] focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-[9px] border border-[rgba(20,22,26,0.12)] bg-white px-3 py-2 text-[13px] text-[#15171C] focus:border-[#C75D2C] focus:outline-none"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-[rgba(20,22,26,0.06)] bg-[#F8F9FB]">
            <tr>
              <th className="px-4 py-3 font-semibold text-[#15171C]">Title</th>
              <th className="px-4 py-3 font-semibold text-[#15171C]">Author</th>
              <th className="px-4 py-3 font-semibold text-[#15171C]">Status</th>
              <th className="px-4 py-3 font-semibold text-[#15171C]">Tier</th>
              <th className="px-4 py-3 font-semibold text-[#15171C]">Cover</th>
              <th className="px-4 py-3 font-semibold text-[#15171C]">Updated</th>
              <th className="px-4 py-3 font-semibold text-[#15171C]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(20,22,26,0.06)]">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-4 w-full animate-pulse rounded bg-[rgba(20,22,26,0.06)]" />
                  </td>
                </tr>
              ))
            ) : stories.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#9AA0A8]">
                  No stories match.
                </td>
              </tr>
            ) : (
              stories.map((s) => (
                <tr key={s.id} className="hover:bg-[rgba(20,22,26,0.02)]">
                  <td className="px-4 py-3 font-medium text-[#15171C]">{s.title}</td>
                  <td className="px-4 py-3 text-[#7C828C]">{s.authorName}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", STATUS_STYLES[s.status] ?? "bg-[rgba(20,22,26,0.07)] text-[#646B73]")}>
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#7C828C]">{s.tier}</td>
                  <td className="px-4 py-3">
                    {s.hasCover ? (
                      <span className="inline-flex items-center gap-1 text-[#1F8A5B]"><ImageIcon size={13} /> Yes</span>
                    ) : (
                      <span className="text-[#C0392B]">Missing</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#7C828C]">
                    {new Date(s.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/kekere/stories/${s.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-[7px] border border-[rgba(20,22,26,0.12)] px-2.5 py-1.5 text-[11px] font-semibold text-[#15171C] hover:bg-[#F0F2F5]"
                    >
                      <Pencil size={11} />
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-[12px] text-[#7C828C]">
          <span>{total} stories total</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-[7px] border border-[rgba(20,22,26,0.12)] px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-[7px] border border-[rgba(20,22,26,0.12)] px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
