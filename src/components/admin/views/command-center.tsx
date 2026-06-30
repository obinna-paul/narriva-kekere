"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

interface CommandCenterProps {
  data: {
    kpiCards: Record<string, number>;
    pendingActionsBreakdown: Record<string, number>;
    revenueChart: { daily: Array<{ date: string; narrivaNgn: number; kekereNgn: number }> };
    userGrowthChart: { daily: Array<{ date: string; newUsers: number }> };
    activityFeed: Array<{ id: string; type: string; description: string; timestamp: string; link: string }>;
  };
}

function KpiCard({ label, value, delta, deltaNote, format, category }: { label: string; value: number; delta?: number; deltaNote?: string; format?: "currency" | "number"; category?: "narriva" | "kekere"; push?: boolean }) {
  const isPositive = (delta ?? 0) >= 0;
  const formatted = format === "currency"
    ? `₦${(value / 1_000_000).toFixed(2)}M`
    : value.toLocaleString();

  return (
    <div className={cn("rounded-[11px] border bg-white px-5 py-5", label === "Pending actions" ? "border-[#B7791F]/30 bg-[#FFFCF6]" : "border-[rgba(20,22,26,0.08)]")}>
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-medium text-[#646B73]">{label}</span>
        {category && (
          <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold uppercase", category === "narriva" ? "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]" : "bg-[rgba(199,93,44,0.12)] text-[#C75D2C]")}>{category}</span>
        )}
      </div>
      <div className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold text-[#1A1C20] tracking-[-0.01em]">{formatted}</div>
      {delta !== undefined && (
        <div className="mt-2 flex items-center gap-1.5 text-[12px]">
          {isPositive ? <TrendingUp size={14} className="text-[#1F8A5B]" /> : <TrendingDown size={14} className="text-[#C0392B]" />}
          <span className={cn("font-semibold", isPositive ? "text-[#1F8A5B]" : "text-[#C0392B]")}>{isPositive ? "↑" : "↓"}{Math.abs(delta)}%</span>
          {deltaNote && <span className="text-[#8B919A]">{deltaNote}</span>}
        </div>
      )}
      {label === "Pending actions" && deltaNote && (
        <Link href="?view=command-center#pending" className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-[#B7791F] hover:underline">
          Open the breakdown <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return <div className="h-[40px]" />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 300;
  const h = 40;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");

  return (
    <svg width={w} height={h} className="w-full h-auto overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart30Day({ daily }: { daily: Array<{ date: string; narrivaNgn: number; kekereNgn: number }> }) {
  const w = 600;
  const h = 140;
  const pad = { left: 40, right: 10, top: 10, bottom: 20 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const barW = Math.max(2, chartW / daily.length - 2);
  const maxVal = Math.max(...daily.map((d) => d.narrivaNgn + d.kekereNgn), 1);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {[0, maxVal / 2, maxVal].map((v) => (
        <g key={v}>
          <line x1={pad.left} y1={pad.top + chartH - (v / maxVal) * chartH} x2={w - pad.right} y2={pad.top + chartH - (v / maxVal) * chartH} stroke="rgba(20,22,26,0.06)" strokeWidth="0.5" />
          <text x={pad.left - 6} y={pad.top + chartH - (v / maxVal) * chartH + 4} textAnchor="end" className="text-[9px]" fill="#9AA0A8">₦{(v / 1000).toFixed(0)}k</text>
        </g>
      ))}
      {daily.map((d, i) => {
        const x = pad.left + i * (chartW / daily.length);
        const nh = (d.narrivaNgn / maxVal) * chartH;
        const kh = (d.kekereNgn / maxVal) * chartH;
        return (
          <g key={d.date}>
            <rect x={x} y={pad.top + chartH - nh - kh} width={barW} height={kh} fill="#C75D2C" rx="1" />
            <rect x={x} y={pad.top + chartH - nh} width={barW} height={nh} fill="#1E3A8A" rx="1" />
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

export function CommandCenter({ data }: CommandCenterProps) {
  const { kpiCards, pendingActionsBreakdown, revenueChart, userGrowthChart, activityFeed } = data;

  const pending = [
    { label: "Stories awaiting review", count: pendingActionsBreakdown.storiesAwaitingReview, href: "story-review" },
    { label: "Author change requests", count: pendingActionsBreakdown.authorChangeRequests, href: "author-projects" },
    { label: "Withdrawals pending", count: pendingActionsBreakdown.withdrawalsPending, href: "withdrawals" },
    { label: "Contracts unsigned (7+ days)", count: pendingActionsBreakdown.contractsUnsigned7Plus, href: "contracts" },
    { label: "Nari high-intent (unread)", count: pendingActionsBreakdown.nariHighIntentUnread, href: "nari-intelligence" },
  ];

  return (
    <div className="px-[34px] py-[30px] max-w-[1320px] space-y-7">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-[14px]">
        <KpiCard label="Revenue this month" value={kpiCards.totalRevenueThisMonthNgn} delta={kpiCards.totalRevenueWoWChange} deltaNote="vs last week" format="currency" />
        <KpiCard label="New registrations" value={kpiCards.newUsersLast7Days} delta={kpiCards.newUsersWoWChange} deltaNote="vs last week" />
        <KpiCard label="Active users" value={kpiCards.activeKekereUsersLast7Days} delta={kpiCards.activeKekereWoWChange} deltaNote="vs last week" category="kekere" />
        <KpiCard label="New submissions" value={kpiCards.newSubmissionsThisWeek} delta={kpiCards.submissionsWoWChange} deltaNote="vs last week" category="narriva" />
        <KpiCard label="Cowries in circulation" value={kpiCards.cowriesInCirculation} delta={kpiCards.cowriesInCirculation > 0 ? 3 : undefined as any} deltaNote="vs last week" category="kekere" />
        <KpiCard label="Pending actions" value={kpiCards.pendingActionsCount} delta={kpiCards.pendingActionsCount > 0 ? 6 : undefined as any} deltaNote="items need attention" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-[1.35fr_1fr_1fr] gap-[14px]">
        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-[#1A1C20]">Revenue (30 days)</span>
            <div className="flex gap-4 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="h-[8px] w-[8px] rounded-sm bg-[#1E3A8A]" /> Narriva</span>
              <span className="flex items-center gap-1.5"><span className="h-[8px] w-[8px] rounded-sm bg-[#C75D2C]" /> Kekere</span>
            </div>
          </div>
          <BarChart30Day daily={revenueChart.daily} />
        </div>

        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
          <span className="text-[13px] font-semibold text-[#1A1C20]">Registrations</span>
          <div className="mt-2">
            <Sparkline data={userGrowthChart.daily.map((d) => d.newUsers)} color="#1F8A5B" />
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-[#1A1C20]">Activity</span>
            <div className="flex items-center gap-1.5">
              <span className="h-[6px] w-[6px] rounded-full bg-[#1F8A5B] animate-pulse" />
              <span className="text-[10px] font-medium text-[#1F8A5B] uppercase tracking-[0.06em]">Live</span>
            </div>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {activityFeed.slice(0, 10).map((a) => {
              const icon = ACTIVITY_ICONS[a.type] ?? { bg: "#F4F5F7", icon: "•" };
              return (
                <a key={a.id} href={a.link} className="flex items-start gap-3 py-2 rounded-[6px] hover:bg-[#FBFBFC] px-2 -mx-2">
                  <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[7px] text-[13px]" style={{ background: icon.bg }}>{icon.icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-[#1A1C20] leading-[1.4] line-clamp-2">{a.description}</p>
                    <p className="text-[10px] text-[#8B919A] mt-0.5">{relativeTime(a.timestamp)}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending queue */}
      <div id="pending" className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
        <span className="text-[13px] font-semibold text-[#1A1C20]">Pending queue</span>
        <div className="mt-3 space-y-[2px]">
          {pending.map((p) => (
            <button key={p.label} type="button" onClick={() => document.dispatchEvent(new CustomEvent("admin-nav", { detail: p.href }))} className="flex w-full items-center gap-4 rounded-[7px] px-3 py-3 text-left hover:bg-[#FBFBFC]">
              <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-[#1A1C20] text-[11px] font-bold text-white">{p.count}</span>
              <span className="flex-1 text-[13px] font-medium text-[#1A1C20]">{p.label}</span>
              <ArrowRight size={14} className="text-[#9AA0A8]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
