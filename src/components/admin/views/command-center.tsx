"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SkeletonKpiCard, SkeletonChart, AdminViewError } from "@/components/admin/admin-skeleton";

interface DashboardData {
  kpiCards: Record<string, number>;
  pendingActionsBreakdown: Record<string, number>;
  revenueChart: { daily: Array<{ date: string; narrivaNgn: number; kekereNgn: number }> };
  userGrowthChart: { daily: Array<{ date: string; newUsers: number }> };
  activityFeed: Array<{ id: string; type: string; description: string; timestamp: string; link: string }>;
}

function KpiCard({ label, value, delta, deltaNote, format, category }: {
  label: string; value: number; delta?: number; deltaNote?: string;
  format?: "currency" | "number"; category?: "narriva" | "kekere";
}) {
  const isPositive = (delta ?? 0) >= 0;
  const formatted = format === "currency"
    ? `₦${(value / 1_000_000).toFixed(2)}M`
    : value.toLocaleString();

  return (
    <div className={cn(
      "rounded-[11px] border bg-white px-5 py-5",
      label === "Pending actions" ? "border-[#B7791F]/30 bg-[#FFFCF6]" : "border-[rgba(20,22,26,0.08)]"
    )}>
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-medium text-[#646B73]">{label}</span>
        {category && (
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
            category === "narriva" ? "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]" : "bg-[rgba(199,93,44,0.12)] text-[#C75D2C]"
          )}>{category}</span>
        )}
      </div>
      <div className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold tracking-[-0.01em] text-[#1A1C20]">
        {formatted}
      </div>
      {delta !== undefined && (
        <div className="mt-2 flex items-center gap-1.5 text-[12px]">
          {isPositive ? <TrendingUp size={14} className="text-[#1F8A5B]" /> : <TrendingDown size={14} className="text-[#C0392B]" />}
          <span className={cn("font-semibold", isPositive ? "text-[#1F8A5B]" : "text-[#C0392B]")}>
            {isPositive ? "↑" : "↓"}{Math.abs(delta)}%
          </span>
          {deltaNote && <span className="text-[#8B919A]">{deltaNote}</span>}
        </div>
      )}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return <div className="h-[60px]" />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 300; const h = 60;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 8) - 4}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RevenueChart({ daily }: { daily: Array<{ date: string; narrivaNgn: number; kekereNgn: number }> }) {
  if (daily.length === 0) return <div className="flex h-[120px] items-center justify-center text-[12px] text-[#9AA0A8]">No revenue data</div>;
  const w = 600; const h = 120;
  const pad = { l: 42, r: 8, t: 8, b: 20 };
  const cw = w - pad.l - pad.r; const ch = h - pad.t - pad.b;
  const maxVal = Math.max(...daily.map((d) => d.narrivaNgn + d.kekereNgn), 1);
  const bw = Math.max(2, cw / daily.length - 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full">
      {[0, maxVal / 2, maxVal].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={pad.t + ch - (v / maxVal) * ch} y2={pad.t + ch - (v / maxVal) * ch} stroke="rgba(20,22,26,0.05)" strokeWidth="0.5" />
          <text x={pad.l - 5} y={pad.t + ch - (v / maxVal) * ch + 4} textAnchor="end" fill="#9AA0A8" fontSize="9">₦{(v / 1000).toFixed(0)}k</text>
        </g>
      ))}
      {daily.map((d, i) => {
        const x = pad.l + i * (cw / daily.length);
        const nh = (d.narrivaNgn / maxVal) * ch;
        const kh = (d.kekereNgn / maxVal) * ch;
        return (
          <g key={d.date}>
            <rect x={x} y={pad.t + ch - nh - kh} width={bw} height={kh} fill="#C75D2C" rx="1" />
            <rect x={x} y={pad.t + ch - nh} width={bw} height={nh} fill="#1E3A8A" rx="1" />
          </g>
        );
      })}
    </svg>
  );
}

const ACTIVITY_ICONS: Record<string, { bg: string; icon: string }> = {
  submission_received: { bg: "#E8EEFF", icon: "📄" },
  story_submitted: { bg: "#FDE8DB", icon: "✏️" },
  story_published: { bg: "#E0F4EA", icon: "📚" },
  book_sold: { bg: "#E0F4EA", icon: "💰" },
  withdrawal_requested: { bg: "#FEF0E0", icon: "🏦" },
  author_requested_changes: { bg: "#FEF0E0", icon: "🔧" },
  deliverable_approved: { bg: "#E0F4EA", icon: "✅" },
  contract_signed: { bg: "#E8EEFF", icon: "✍️" },
};

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

const PENDING_LINKS = [
  { key: "storiesAwaitingReview", label: "Stories awaiting review", href: "/admin/story-review" },
  { key: "authorChangeRequests", label: "Author change requests", href: "/admin/author-projects" },
  { key: "withdrawalsPending", label: "Withdrawals pending", href: "/admin/withdrawals" },
  { key: "contractsUnsigned7Plus", label: "Contracts unsigned (7+ days)", href: "/admin/contracts" },
  { key: "nariHighIntentUnread", label: "Nari high-intent (unread)", href: "/admin/nari-intelligence" },
];

export function CommandCenter() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/command-center");
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
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonKpiCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-[1.35fr_1fr_1fr]">
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error || !data) return <AdminViewError message={error ?? undefined} onRetry={load} />;

  const { kpiCards, pendingActionsBreakdown, revenueChart, userGrowthChart, activityFeed } = data;

  return (
    <div className="space-y-7">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Revenue this month" value={kpiCards.totalRevenueThisMonthNgn ?? 0} delta={kpiCards.totalRevenueWoWChange} deltaNote="vs last week" format="currency" />
        <KpiCard label="New registrations" value={kpiCards.newUsersLast7Days ?? 0} delta={kpiCards.newUsersWoWChange} deltaNote="vs last week" />
        <KpiCard label="Active users" value={kpiCards.activeKekereUsersLast7Days ?? 0} delta={kpiCards.activeKekereWoWChange} deltaNote="vs last week" category="kekere" />
        <KpiCard label="New submissions" value={kpiCards.newSubmissionsThisWeek ?? 0} delta={kpiCards.submissionsWoWChange} deltaNote="vs last week" category="narriva" />
        <KpiCard label="Cowries in circulation" value={kpiCards.cowriesInCirculation ?? 0} category="kekere" />
        <KpiCard label="Pending actions" value={kpiCards.pendingActionsCount ?? 0} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-[1.35fr_1fr_1fr]">
        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#1A1C20]">Revenue (30 days)</span>
            <div className="flex gap-4 text-[11px] text-[#646B73]">
              <span className="flex items-center gap-1.5"><span className="inline-block h-[8px] w-[8px] rounded-sm bg-[#1E3A8A]" /> Narriva</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-[8px] w-[8px] rounded-sm bg-[#C75D2C]" /> Kekere</span>
            </div>
          </div>
          <RevenueChart daily={revenueChart.daily} />
        </div>

        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
          <span className="text-[13px] font-semibold text-[#1A1C20]">Registrations (30 days)</span>
          <div className="mt-3">
            <Sparkline data={userGrowthChart.daily.map((d) => d.newUsers)} color="#1F8A5B" />
          </div>
          {userGrowthChart.daily.length === 0 && (
            <p className="mt-2 text-[12px] text-[#9AA0A8]">No registration data yet</p>
          )}
        </div>

        <div className="overflow-hidden rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#1A1C20]">Activity</span>
            <div className="flex items-center gap-1.5">
              <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-[#1F8A5B]" />
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#1F8A5B]">Live</span>
            </div>
          </div>
          {activityFeed.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-[#9AA0A8]">No recent activity</p>
          ) : (
            <div className="max-h-[200px] space-y-1.5 overflow-y-auto">
              {activityFeed.slice(0, 12).map((a) => {
                const icon = ACTIVITY_ICONS[a.type] ?? { bg: "#F4F5F7", icon: "·" };
                return (
                  <a key={a.id} href={a.link} className="-mx-2 flex items-start gap-2.5 rounded-[6px] px-2 py-2 hover:bg-[#FBFBFC]">
                    <div className="flex h-[28px] w-[28px] flex-none items-center justify-center rounded-[7px] text-[12px]" style={{ background: icon.bg }}>{icon.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[12px] leading-[1.4] text-[#1A1C20]">{a.description}</p>
                      <p className="mt-0.5 text-[10px] text-[#8B919A]">{relativeTime(a.timestamp)}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pending queue */}
      <div id="pending" className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#1A1C20]">Pending queue</span>
          <span className="text-[12px] text-[#8B919A]">{kpiCards.pendingActionsCount ?? 0} items total</span>
        </div>
        <div className="space-y-[2px]">
          {PENDING_LINKS.map((p) => {
            const count = pendingActionsBreakdown[p.key] ?? 0;
            return (
              <Link key={p.key} href={p.href} className="flex w-full items-center gap-4 rounded-[7px] px-3 py-3 hover:bg-[#FBFBFC]">
                <span className={cn(
                  "flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-[11px] font-bold text-white",
                  count === 0 ? "bg-[#D0D3D8]" : "bg-[#1A1C20]"
                )}>{count}</span>
                <span className="flex-1 text-[13px] font-medium text-[#1A1C20]">{p.label}</span>
                <ArrowRight size={14} className="text-[#9AA0A8]" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
