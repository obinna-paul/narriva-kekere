"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, SkeletonKpiCard, SkeletonChart } from "@/components/admin/admin-skeleton";

interface AnalyticsData {
  dau: number;
  wau: number;
  mau: number;
  dauWauRatio: number;
  wauMauRatio: number;
  avgStoriesReadPerActiveUserPerWeek: number;
  topGenres: Array<{ genre: string; readers: number }>;
  cohortRetention: Array<{ week: string; retained: number; total: number }>;
}

function RetentionBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 flex-none text-right text-[11px] text-[#8B919A]">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-[rgba(20,22,26,0.07)] h-[8px]">
        <div className="h-full rounded-full bg-[#C75D2C] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-[12px] font-semibold text-[#1A1C20]">{pct}%</span>
    </div>
  );
}

export function UserAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kekere/users/analytics");
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
        <div className="grid grid-cols-4 gap-[14px]">{Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)}</div>
        <div className="grid grid-cols-2 gap-[14px]"><SkeletonChart /><SkeletonChart /></div>
      </div>
    );
  }

  if (error) return <AdminViewError message={error} onRetry={load} />;
  if (!data) return null;

  const dauWau = data.dauWauRatio ? (data.dauWauRatio * 100).toFixed(1) : "—";
  const wauMau = data.wauMauRatio ? (data.wauMauRatio * 100).toFixed(1) : "—";

  return (
    <div className="space-y-7">
      {/* DAU / WAU / MAU */}
      <div className="grid grid-cols-4 gap-[14px]">
        {[
          { label: "DAU", value: data.dau.toLocaleString(), note: "Daily active users" },
          { label: "WAU", value: data.wau.toLocaleString(), note: "Weekly active users" },
          { label: "MAU", value: data.mau.toLocaleString(), note: "Monthly active users" },
          { label: "Avg unlocks / user", value: data.avgStoriesReadPerActiveUserPerWeek?.toFixed(1) ?? "—", note: "per active user, last 7 days" },
        ].map((k) => (
          <div key={k.label} className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
            <span className="text-[12px] font-medium text-[#646B73]">{k.label}</span>
            <div className="mt-2 font-[family-name:var(--font-display)] text-[28px] font-semibold tabular-nums text-[#1A1C20]">{k.value}</div>
            <p className="mt-1 text-[11px] text-[#9AA0A8]">{k.note}</p>
          </div>
        ))}
      </div>

      {/* Stickiness + Genre breakdown */}
      <div className="grid grid-cols-2 gap-[14px]">
        {/* Stickiness ratios */}
        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
          <h3 className="mb-4 text-[13px] font-semibold text-[#1A1C20]">Stickiness</h3>
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex justify-between text-[12px]">
                <span className="font-medium text-[#646B73]">DAU/WAU</span>
                <span className="font-semibold text-[#1A1C20]">{dauWau}%</span>
              </div>
              <div className="h-[8px] overflow-hidden rounded-full bg-[rgba(20,22,26,0.07)]">
                <div className="h-full rounded-full bg-[#1E3A8A]" style={{ width: `${data.dauWauRatio * 100}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-[#9AA0A8]">% of weekly users who are daily users</p>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-[12px]">
                <span className="font-medium text-[#646B73]">WAU/MAU</span>
                <span className="font-semibold text-[#1A1C20]">{wauMau}%</span>
              </div>
              <div className="h-[8px] overflow-hidden rounded-full bg-[rgba(20,22,26,0.07)]">
                <div className="h-full rounded-full bg-[#C75D2C]" style={{ width: `${data.wauMauRatio * 100}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-[#9AA0A8]">% of monthly users who are weekly users</p>
            </div>
          </div>
        </div>

        {/* Top genres by readers */}
        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
          <h3 className="mb-4 text-[13px] font-semibold text-[#1A1C20]">Readers by genre</h3>
          {(data.topGenres ?? []).length === 0 ? (
            <p className="text-[12px] text-[#9AA0A8]">No genre data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.topGenres.map((g, i) => {
                const maxReaders = Math.max(...data.topGenres.map((x) => x.readers), 1);
                const pct = Math.round((g.readers / maxReaders) * 100);
                return (
                  <div key={g.genre} className="flex items-center gap-3">
                    <span className="w-8 flex-none text-right text-[11px] text-[#9AA0A8]">#{i + 1}</span>
                    <span className="w-20 flex-none truncate text-[12px] font-medium text-[#1A1C20]">{g.genre}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-[rgba(20,22,26,0.07)] h-[6px]">
                      <div className="h-full rounded-full bg-[#C75D2C]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 text-right text-[12px] font-semibold text-[#1A1C20]">{g.readers}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cohort retention */}
      {(data.cohortRetention ?? []).length > 0 && (
        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
          <h3 className="mb-4 text-[13px] font-semibold text-[#1A1C20]">Cohort retention (weekly)</h3>
          <div className="space-y-2.5">
            {data.cohortRetention.map((c) => {
              const pct = c.total > 0 ? Math.round((c.retained / c.total) * 100) : 0;
              return <RetentionBar key={c.week} label={c.week} pct={pct} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
