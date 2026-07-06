"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState, SkeletonKpiCard, SkeletonTableShell } from "@/components/admin/admin-skeleton";

interface PipelineSummary {
  totalConversationsThisWeek: number;
  highIntentThisWeek: number;
  leadsCreatedThisMonth: number;
  conversionRate: number;
}

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  manuscriptTopic: string | null;
  intentLevel: "LOW" | "MEDIUM" | "HIGH" | "BROWSING";
  status: "NEW" | "CONTACTED" | "IN_DISCUSSION" | "SUBMITTED" | "WON" | "LOST";
  conversationCount: number;
  updatedAt: string;
}

const INTENT_STYLES: Record<string, string> = {
  BROWSING: "bg-[rgba(20,22,26,0.07)] text-[#8B919A]",
  LOW: "bg-[rgba(20,22,26,0.07)] text-[#8B919A]",
  MEDIUM: "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]",
  HIGH: "bg-[rgba(199,93,44,0.12)] text-[#C75D2C]",
};

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-[rgba(183,121,31,0.10)] text-[#B7791F]",
  CONTACTED: "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]",
  IN_DISCUSSION: "bg-[rgba(107,33,168,0.12)] text-[#6B21A8]",
  SUBMITTED: "bg-[rgba(107,33,168,0.12)] text-[#6B21A8]",
  WON: "bg-[rgba(31,138,91,0.10)] text-[#1F8A5B]",
  LOST: "bg-[rgba(20,22,26,0.07)] text-[#8B919A]",
};

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

export function NariIntelligence() {
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intentFilter, setIntentFilter] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (intentFilter !== "ALL") params.set("intentLevel", intentFilter);
      const [sumRes, leadRes] = await Promise.all([
        fetch("/api/admin/nari/pipeline/summary"),
        fetch(`/api/admin/nari/leads?${params}`),
      ]);
      if (!sumRes.ok || !leadRes.ok) throw new Error("Failed to load Nari data");
      const [s, l] = await Promise.all([sumRes.json(), leadRes.json()]);
      setSummary(s);
      setLeads(l.leads ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [intentFilter]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-7">
        <div className="grid grid-cols-4 gap-[14px]">{Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)}</div>
        <SkeletonTableShell rows={5} cols={5} />
      </div>
    );
  }

  if (error) return <AdminViewError message={error} onRetry={load} />;

  const s = summary ?? { totalConversationsThisWeek: 0, highIntentThisWeek: 0, leadsCreatedThisMonth: 0, conversionRate: 0 };

  return (
    <div className="space-y-7">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-[14px]">
        {[
          { label: "Conversations (7d)", value: s.totalConversationsThisWeek.toLocaleString() },
          { label: "High intent (7d)", value: s.highIntentThisWeek.toLocaleString() },
          { label: "Leads created (30d)", value: s.leadsCreatedThisMonth.toLocaleString() },
          { label: "Conversion rate", value: `${s.conversionRate}%` },
        ].map((k) => (
          <div key={k.label} className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
            <span className="text-[12px] font-medium text-[#646B73]">{k.label}</span>
            <div className="mt-2 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[#1A1C20]">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Lead pipeline table */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-[13px] font-semibold text-[#1A1C20]">Lead pipeline</h3>
          <div className="flex gap-1 rounded-[9px] bg-[rgba(20,22,26,0.06)] p-[3px]">
            {["ALL", "HIGH", "MEDIUM", "LOW", "BROWSING"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setIntentFilter(f)}
                className={cn("px-3 py-1.5 text-[11px] font-semibold rounded-[7px] capitalize transition-colors", intentFilter === f ? "bg-white text-[#1A1C20] shadow-sm" : "text-[#8B919A] hover:text-[#1A1C20]")}
              >
                {f === "ALL" ? "All" : `${f.charAt(0) + f.slice(1).toLowerCase()} intent`}
              </button>
            ))}
          </div>
        </div>

        {leads.length === 0 ? (
          <AdminEmptyState title="No leads" note={intentFilter === "ALL" ? "Nari conversations that express interest will appear here." : `No ${intentFilter.toLowerCase()} intent leads.`} />
        ) : (
          <div className="overflow-hidden rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
            <div className="grid grid-cols-[2fr_2fr_0.8fr_0.8fr_0.8fr_1fr] items-center gap-4 border-b border-[rgba(20,22,26,0.08)] bg-[#FBFBFC] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">
              <span>Contact</span>
              <span>Summary</span>
              <span>Intent</span>
              <span>Status</span>
              <span>Conversations</span>
              <span>Last active</span>
            </div>
            {leads.map((lead) => (
              <div key={lead.id} className="grid grid-cols-[2fr_2fr_0.8fr_0.8fr_0.8fr_1fr] items-center gap-4 border-b border-[rgba(20,22,26,0.05)] px-5 py-4 last:border-0 hover:bg-[#FBFBFC]">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#1A1C20]">{lead.name ?? "Anonymous"}</p>
                  {lead.email && <p className="truncate text-[11px] text-[#8B919A]">{lead.email}</p>}
                </div>
                <p className="line-clamp-2 text-[12px] text-[#646B73]">{lead.manuscriptTopic ?? "No summary yet."}</p>
                <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase w-fit", INTENT_STYLES[lead.intentLevel])}>{lead.intentLevel}</span>
                <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase w-fit", STATUS_STYLES[lead.status])}>{lead.status.replace("_", " ")}</span>
                <span className="text-[13px] text-[#1A1C20]">{lead.conversationCount}</span>
                <span className="text-[12px] text-[#8B919A]">{relativeTime(lead.updatedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
