"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState, SkeletonTableShell, SkeletonKpiCard } from "@/components/admin/admin-skeleton";

interface TrendingStory {
  storyId: string;
  title: string;
  authorName: string;
  authorSlug: string | null;
  unlocks: number;
  trendPct: number;
}

interface GenreData {
  label: string;
  count: number;
  pct: number;
}

interface RisingWriter {
  rank: number;
  userId: string;
  name: string;
  earnedCowriesLast7d: number;
}

interface PerfData {
  trending: TrendingStory[];
  genres: GenreData[];
  risingWriters: RisingWriter[];
}

const GENRE_COLORS = ["#C75D2C", "#1E3A8A", "#6B21A8", "#1F8A5B", "#B7791F", "#646B73"];

export function Performance() {
  const [data, setData] = useState<PerfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kekere/stories/performance");
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-7">
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonKpiCard key={i} />)}
        </div>
        <SkeletonTableShell rows={6} cols={4} />
      </div>
    );
  }

  if (error) return <AdminViewError message={error} onRetry={load} />;
  if (!data) return null;

  const { trending, genres, risingWriters } = data;

  const totalUnlocks = trending.reduce((s, t) => s + t.unlocks, 0);

  return (
    <div className="space-y-7">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
          <span className="text-[12px] font-medium text-[#646B73]">Trending stories (7d)</span>
          <div className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold text-[#1A1C20]">{trending.length}</div>
        </div>
        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
          <span className="text-[12px] font-medium text-[#646B73]">Total unlocks (7d)</span>
          <div className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold text-[#1A1C20]">{totalUnlocks.toLocaleString()}</div>
        </div>
        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
          <span className="text-[12px] font-medium text-[#646B73]">Active genres</span>
          <div className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold text-[#1A1C20]">{genres.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-[1.6fr_1fr]">
        {/* Trending stories table */}
        <div>
          <h2 className="mb-3 text-[13px] font-semibold text-[#1A1C20]">Trending this week</h2>
          {trending.length === 0 ? (
            <AdminEmptyState title="No trending data" note="Unlock activity will appear here." />
          ) : (
            <div className="overflow-x-auto rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
              <div className="grid min-w-[600px] grid-cols-[auto_2fr_1fr_1fr_0.8fr] items-center gap-4 border-b border-[rgba(20,22,26,0.08)] bg-[#FBFBFC] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">
                <span>#</span>
                <span>Story</span>
                <span>Author</span>
                <span>Unlocks</span>
                <span>Trend</span>
              </div>
              {trending.map((s, i) => (
                <div key={s.storyId} className="grid min-w-[600px] grid-cols-[auto_2fr_1fr_1fr_0.8fr] items-center gap-4 border-b border-[rgba(20,22,26,0.05)] px-5 py-3.5 last:border-0 hover:bg-[#FBFBFC]">
                  <span className="text-[13px] font-bold text-[#9AA0A8]">{i + 1}</span>
                  <p className="truncate text-[13px] font-semibold text-[#1A1C20]">{s.title}</p>
                  <p className="truncate text-[12px] text-[#646B73]">{s.authorName}</p>
                  <span className="text-[13px] font-semibold text-[#1A1C20]">{s.unlocks.toLocaleString()}</span>
                  <div className={cn("flex items-center gap-1 text-[12px] font-semibold", s.trendPct >= 0 ? "text-[#1F8A5B]" : "text-[#C0392B]")}>
                    {s.trendPct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {Math.abs(s.trendPct)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: genre breakdown + rising writers */}
        <div className="space-y-[14px]">
          {/* Genre breakdown */}
          <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
            <h3 className="mb-4 text-[13px] font-semibold text-[#1A1C20]">Genre breakdown (30d)</h3>
            {genres.length === 0 ? (
              <p className="text-[12px] text-[#9AA0A8]">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {genres.map((g, i) => (
                  <div key={g.label}>
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span className="font-medium text-[#1A1C20]">{g.label}</span>
                      <span className="text-[#8B919A]">{g.pct}%</span>
                    </div>
                    <div className="h-[6px] overflow-hidden rounded-full bg-[rgba(20,22,26,0.07)]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${g.pct}%`, background: GENRE_COLORS[i % GENRE_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rising writers */}
          <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
            <h3 className="mb-4 text-[13px] font-semibold text-[#1A1C20]">Rising writers (7d earnings)</h3>
            {risingWriters.length === 0 ? (
              <p className="text-[12px] text-[#9AA0A8]">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {risingWriters.map((w) => (
                  <div key={w.userId} className="flex items-center gap-3">
                    <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-[#F4F5F7] text-[11px] font-bold text-[#646B73]">
                      {w.rank}
                    </span>
                    <span className="flex-1 text-[13px] font-medium text-[#1A1C20]">{w.name}</span>
                    <span className="font-mono text-[12px] text-[#C75D2C]">{w.earnedCowriesLast7d.toLocaleString()} ₵</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
