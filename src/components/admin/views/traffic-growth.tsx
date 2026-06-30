"use client";

import { useEffect, useState } from "react";

interface TrafficData {
  summary?: { sessions: number; users: number; pageviews: number; bounceRate: number; pagesPerSession: number; avgSessionDuration: number };
}

export function TrafficGrowth() {
  const [data, setData] = useState<TrafficData | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics/traffic-overview").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  const s = data?.summary;

  return (
    <div className="px-[34px] py-[30px] max-w-[1320px] space-y-7">
      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-[9px] bg-[rgba(20,22,26,0.06)] p-[3px] w-fit">
        {["Overview", "Acquisition", "Geography", "Funnels"].map((t) => (
          <button key={t} className={cn("px-4 py-2 text-[13px] font-medium rounded-[7px] transition-colors", t === "Overview" ? "bg-white text-[#1A1C20] shadow-sm" : "text-[#8B919A]")}>{t}</button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-[14px]">
        {[
          { label: "Sessions", value: s?.sessions?.toLocaleString() ?? "—", sub: "30 days" },
          { label: "Users", value: s?.users?.toLocaleString() ?? "—", sub: "30 days" },
          { label: "Pageviews", value: s?.pageviews?.toLocaleString() ?? "—", sub: "30 days" },
          { label: "Avg session", value: s ? formatSeconds(s.avgSessionDuration) : "—", sub: "per visitor" },
          { label: "Bounce rate", value: s ? `${s.bounceRate}%` : "—", sub: "sessions" },
          { label: "Pages / session", value: s?.pagesPerSession?.toFixed(1) ?? "—", sub: "avg" },
        ].map((card) => (
          <div key={card.label} className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-4">
            <div className="text-[12px] font-medium text-[#646B73]">{card.label}</div>
            <div className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[#1A1C20]">{card.value}</div>
            <div className="mt-1 text-[11px] text-[#9AA0A8]">{card.sub}</div>
          </div>
        ))}
      </div>

      {!s && <p className="text-[14px] text-[#8B919A] py-10 text-center">Connect GA4 to see traffic analytics.</p>}
    </div>
  );
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

function cn(...args: (string | undefined | false | null)[]): string {
  return args.filter(Boolean).join(" ");
}
