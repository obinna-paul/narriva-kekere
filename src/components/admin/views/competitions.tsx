"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState, SkeletonTableShell } from "@/components/admin/admin-skeleton";

interface Competition {
  id: string;
  title: string;
  genre: string | null;
  theme: string | null;
  status: "DRAFT" | "OPEN" | "JUDGING" | "CLOSED";
  entryCount: number;
  maxEntries: number | null;
  prizeDescription: string | null;
  openAt: string | null;
  closeAt: string | null;
  cowrieEntryFee: number;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-[rgba(20,22,26,0.07)] text-[#646B73]",
  OPEN: "bg-[rgba(31,138,91,0.10)] text-[#1F8A5B]",
  JUDGING: "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]",
  CLOSED: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "2-digit" });
}

export function CompetitionsView() {
  const [items, setItems] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("status", filter);
      const res = await fetch(`/api/kekere/competitions?${params}&admin=1`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      setItems(d.competitions ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const FILTERS = ["ALL", "OPEN", "JUDGING", "DRAFT", "CLOSED"];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-[9px] bg-[rgba(20,22,26,0.06)] p-[3px]">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn("flex-none whitespace-nowrap px-3.5 py-2 text-[12px] font-semibold rounded-[7px] capitalize transition-colors", filter === f ? "bg-white text-[#1A1C20] shadow-sm" : "text-[#8B919A] hover:text-[#1A1C20]")}
            >
              {f}
            </button>
          ))}
        </div>
        <a
          href="/admin/kekere/competitions/new"
          className="ml-auto rounded-[8px] bg-[#1A1C20] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#2D3139]"
        >
          + New competition
        </a>
      </div>

      {loading ? (
        <SkeletonTableShell rows={5} cols={5} />
      ) : error ? (
        <AdminViewError message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <AdminEmptyState title="No competitions" note="Create a competition to get started." />
      ) : (
        <div className="overflow-x-auto rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
          <div className="grid min-w-[820px] grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr_0.8fr_auto] items-center gap-4 border-b border-[rgba(20,22,26,0.08)] bg-[#FBFBFC] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">
            <span>Title</span>
            <span>Genre</span>
            <span>Status</span>
            <span>Entries</span>
            <span>Closes</span>
            <span>Entry fee</span>
            <span className="text-right">Actions</span>
          </div>
          {items.map((c) => (
            <div key={c.id} className="grid min-w-[820px] grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr_0.8fr_auto] items-center gap-4 border-b border-[rgba(20,22,26,0.05)] px-5 py-4 last:border-0 hover:bg-[#FBFBFC]">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#1A1C20]">{c.title}</p>
                {c.prizeDescription && <p className="truncate text-[11px] text-[#8B919A]">Prize: {c.prizeDescription}</p>}
              </div>
              <span className="truncate text-[12px] text-[#646B73]">{c.genre ?? "Open"}</span>
              <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase w-fit", STATUS_STYLES[c.status] ?? STATUS_STYLES.DRAFT)}>
                {c.status}
              </span>
              <span className="text-[13px] text-[#1A1C20]">
                {c.entryCount}
                {c.maxEntries ? <span className="text-[#9AA0A8]">/{c.maxEntries}</span> : ""}
              </span>
              <span className="text-[12px] text-[#8B919A]">{fmtDate(c.closeAt)}</span>
              <span className="text-[12px] text-[#1A1C20]">{c.cowrieEntryFee > 0 ? `${c.cowrieEntryFee} ₵` : "Free"}</span>
              <div className="flex items-center gap-2">
                <a
                  href={`/admin/kekere/competitions/${c.id}`}
                  className="rounded-[7px] border border-[rgba(20,22,26,0.14)] px-3 py-1.5 text-[11px] font-medium text-[#646B73] hover:bg-[#F4F5F7]"
                >
                  View entries
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
