"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState, SkeletonKpiCard, SkeletonTableShell } from "@/components/admin/admin-skeleton";

interface BookSalesOverview {
  totalRevenueAllTimeNgn: number;
  totalUnitsAllTime: number;
  avgRevenuePerSale: number;
  titlesLive: number;
}

interface BookSalesRow {
  id: string;
  title: string;
  authorName: string;
  price: number;
  totalUnits: number;
  totalRevenueNgn: number;
  lastSaleAt: string | null;
}

function fmtNgn(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(1)}k`;
  return `₦${n.toLocaleString()}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export function BookSalesView() {
  const [overview, setOverview] = useState<BookSalesOverview | null>(null);
  const [books, setBooks] = useState<BookSalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, bkRes] = await Promise.all([
        fetch("/api/admin/narriva/book-sales/overview"),
        fetch("/api/admin/narriva/book-sales/by-book"),
      ]);
      if (!ovRes.ok || !bkRes.ok) throw new Error("Failed to load book sales");
      const [ov, bk] = await Promise.all([ovRes.json(), bkRes.json()]);
      setOverview(ov);
      setBooks(bk.books ?? []);
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
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)}</div>
        <SkeletonTableShell rows={6} cols={5} />
      </div>
    );
  }

  if (error) return <AdminViewError message={error} onRetry={load} />;

  const ov = overview ?? { totalRevenueAllTimeNgn: 0, totalUnitsAllTime: 0, avgRevenuePerSale: 0, titlesLive: 0 };

  return (
    <div className="space-y-7">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total revenue", value: fmtNgn(ov.totalRevenueAllTimeNgn) },
          { label: "Copies sold", value: ov.totalUnitsAllTime.toLocaleString() },
          { label: "Avg price", value: fmtNgn(ov.avgRevenuePerSale) },
          { label: "Titles live", value: ov.titlesLive.toLocaleString() },
        ].map((k) => (
          <div key={k.label} className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
            <span className="text-[12px] font-medium text-[#646B73]">{k.label}</span>
            <div className="mt-2 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[#1A1C20]">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Per-book table */}
      {books.length === 0 ? (
        <AdminEmptyState title="No book sales yet" note="Sales will appear here once books are purchased." />
      ) : (
        <div className="overflow-x-auto rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
          <div className="grid min-w-[760px] grid-cols-[2fr_1.5fr_1fr_1fr_1fr_0.8fr] items-center gap-4 border-b border-[rgba(20,22,26,0.08)] bg-[#FBFBFC] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">
            <span>Title</span>
            <span>Author</span>
            <span>Price</span>
            <span>Copies sold</span>
            <span>Revenue</span>
            <span>Last sale</span>
          </div>
          {books.map((b) => (
            <div key={b.id} className="grid min-w-[760px] grid-cols-[2fr_1.5fr_1fr_1fr_1fr_0.8fr] items-center gap-4 border-b border-[rgba(20,22,26,0.05)] px-5 py-3.5 last:border-0 hover:bg-[#FBFBFC]">
              <p className="truncate text-[13px] font-semibold text-[#1A1C20]">{b.title}</p>
              <p className="truncate text-[12px] text-[#646B73]">{b.authorName}</p>
              <span className="text-[13px] text-[#1A1C20]">{fmtNgn(b.price)}</span>
              <span className="text-[13px] text-[#1A1C20]">{b.totalUnits.toLocaleString()}</span>
              <span className="text-[13px] font-semibold text-[#1F8A5B]">{fmtNgn(b.totalRevenueNgn)}</span>
              <span className="text-[12px] text-[#8B919A]">{fmtDate(b.lastSaleAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
