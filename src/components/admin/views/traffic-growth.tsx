"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, SkeletonKpiCard, SkeletonTableShell } from "@/components/admin/admin-skeleton";

type Tab = "overview" | "acquisition" | "geography" | "funnels";

interface TrafficOverview {
  summary: {
    sessions: number;
    users: number;
    pageviews: number;
    bounceRate: number;
    pagesPerSession: number;
    avgSessionDuration: number;
  };
}

interface AcquisitionData {
  channels: Array<{ channel: string; sessions: number; pct: number; bounceRate: number }>;
}

interface GeoData {
  countries: Array<{ country: string; users: number; pct: number }>;
}

interface FunnelStep {
  step: number;
  name: string;
  count: number;
  dropoffRate: number | null;
  note?: string;
}

interface FunnelData {
  narriva: FunnelStep[];
  kekere: FunnelStep[];
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

function OverviewTab() {
  const [data, setData] = useState<TrafficOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics/traffic-overview");
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="grid grid-cols-3 gap-[14px]">{Array.from({ length: 6 }).map((_, i) => <SkeletonKpiCard key={i} />)}</div>;
  if (error) return <AdminViewError message={error} onRetry={load} />;

  const s = data?.summary;
  const cards = [
    { label: "Sessions", value: s?.sessions?.toLocaleString() ?? "—", note: "30 days" },
    { label: "Unique users", value: s?.users?.toLocaleString() ?? "—", note: "30 days" },
    { label: "Pageviews", value: s?.pageviews?.toLocaleString() ?? "—", note: "30 days" },
    { label: "Avg session", value: s ? formatSeconds(s.avgSessionDuration) : "—", note: "per visitor" },
    { label: "Bounce rate", value: s ? `${s.bounceRate}%` : "—", note: "exit after 1 page" },
    { label: "Pages / session", value: s?.pagesPerSession?.toFixed(1) ?? "—", note: "avg" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-[14px]">
        {cards.map((c) => (
          <div key={c.label} className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
            <span className="text-[12px] font-medium text-[#646B73]">{c.label}</span>
            <div className="mt-2 font-[family-name:var(--font-display)] text-[28px] font-semibold tabular-nums text-[#1A1C20]">{c.value}</div>
            <span className="text-[11px] text-[#9AA0A8]">{c.note}</span>
          </div>
        ))}
      </div>
      {!s && <p className="py-6 text-center text-[13px] text-[#9AA0A8]">Connect GA4 to see real traffic data.</p>}
    </div>
  );
}

function AcquisitionTab() {
  const [data, setData] = useState<AcquisitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics/acquisition");
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SkeletonTableShell rows={5} cols={4} />;
  if (error) return <AdminViewError message={error} onRetry={load} />;

  const channels = data?.channels ?? [];
  if (channels.length === 0) return <p className="py-10 text-center text-[13px] text-[#9AA0A8]">Connect GA4 for acquisition data.</p>;

  return (
    <div className="overflow-hidden rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 border-b border-[rgba(20,22,26,0.08)] bg-[#FBFBFC] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">
        <span>Channel</span><span>Sessions</span><span>Share</span><span>Bounce</span>
      </div>
      {channels.map((c) => (
        <div key={c.channel} className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 border-b border-[rgba(20,22,26,0.05)] px-5 py-3.5 last:border-0 hover:bg-[#FBFBFC]">
          <span className="text-[13px] font-medium text-[#1A1C20]">{c.channel}</span>
          <span className="text-[13px] text-[#1A1C20]">{c.sessions.toLocaleString()}</span>
          <span className="text-[13px] text-[#646B73]">{c.pct}%</span>
          <span className="text-[13px] text-[#646B73]">{c.bounceRate}%</span>
        </div>
      ))}
    </div>
  );
}

function GeoTab() {
  const [data, setData] = useState<GeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics/geographic");
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SkeletonTableShell rows={5} cols={3} />;
  if (error) return <AdminViewError message={error} onRetry={load} />;

  const countries = data?.countries ?? [];
  if (countries.length === 0) return <p className="py-10 text-center text-[13px] text-[#9AA0A8]">Connect GA4 for geographic data.</p>;

  return (
    <div className="overflow-hidden rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
      <div className="grid grid-cols-[2fr_1fr_1fr] items-center gap-4 border-b border-[rgba(20,22,26,0.08)] bg-[#FBFBFC] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">
        <span>Country</span><span>Users</span><span>Share</span>
      </div>
      {countries.map((c) => {
        const maxPct = Math.max(...countries.map((x) => x.pct), 1);
        return (
          <div key={c.country} className="grid grid-cols-[2fr_1fr_1fr] items-center gap-4 border-b border-[rgba(20,22,26,0.05)] px-5 py-3.5 last:border-0 hover:bg-[#FBFBFC]">
            <div className="flex items-center gap-3">
              <div className="h-[6px] w-[60px] overflow-hidden rounded-full bg-[rgba(20,22,26,0.07)]">
                <div className="h-full rounded-full bg-[#1E3A8A]" style={{ width: `${(c.pct / maxPct) * 100}%` }} />
              </div>
              <span className="text-[13px] font-medium text-[#1A1C20]">{c.country}</span>
            </div>
            <span className="text-[13px] text-[#1A1C20]">{c.users.toLocaleString()}</span>
            <span className="text-[13px] text-[#646B73]">{c.pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

function FunnelsTab() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics/funnels");
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-[11px] bg-[rgba(20,22,26,0.06)]" />)}</div>;
  if (error) return <AdminViewError message={error} onRetry={load} />;

  const narriva = data?.narriva ?? [];
  const kekere = data?.kekere ?? [];
  if (narriva.length === 0 && kekere.length === 0) return <p className="py-10 text-center text-[13px] text-[#9AA0A8]">Connect GA4 for funnel data.</p>;

  function FunnelSection({ title, steps }: { title: string; steps: FunnelStep[] }) {
    if (steps.length === 0) return null;
    const maxCount = Math.max(...steps.map((s) => s.count), 1);
    return (
      <div className="space-y-3">
        <h3 className="text-[13px] font-semibold text-[#1A1C20]">{title}</h3>
        {steps.map((step) => (
          <div key={step.step} className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#1A1C20] text-[11px] font-bold text-white">{step.step}</span>
                <span className="text-[13px] font-semibold text-[#1A1C20]">{step.name}</span>
              </div>
              <div className="flex items-center gap-4 text-[12px]">
                <span className="font-semibold text-[#1A1C20]">{step.count.toLocaleString()} users</span>
                {step.dropoffRate !== null && step.dropoffRate > 0 && <span className="text-[#C0392B]">−{step.dropoffRate}% dropoff</span>}
              </div>
            </div>
            <div className="h-[8px] overflow-hidden rounded-full bg-[rgba(20,22,26,0.07)]">
              <div className="h-full rounded-full bg-[#1E3A8A] transition-all" style={{ width: `${(step.count / maxCount) * 100}%` }} />
            </div>
            {step.note && <p className="mt-2 text-[11px] italic text-[#9AA0A8]">{step.note}</p>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <FunnelSection title="Narriva" steps={narriva} />
      <FunnelSection title="Kekere" steps={kekere} />
    </div>
  );
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "acquisition", label: "Acquisition" },
  { key: "geography", label: "Geography" },
  { key: "funnels", label: "Funnels" },
];

export function TrafficGrowth() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-[9px] bg-[rgba(20,22,26,0.06)] p-[3px] w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn("px-4 py-2 text-[13px] font-medium rounded-[7px] transition-colors", tab === t.key ? "bg-white text-[#1A1C20] shadow-sm" : "text-[#8B919A] hover:text-[#1A1C20]")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "acquisition" && <AcquisitionTab />}
      {tab === "geography" && <GeoTab />}
      {tab === "funnels" && <FunnelsTab />}
    </div>
  );
}
