"use client";

import { cn } from "@/lib/utils/cn";
import { Bell } from "lucide-react";

interface AdminTopBarProps {
  section: string;
  subsection: string;
  title: string;
  range: string;
  onRangeChange: (range: string) => void;
}

const RANGES = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
];

export function AdminTopBar({ section, subsection, title, range, onRangeChange }: AdminTopBarProps) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between px-[34px] h-[62px] border-b border-[rgba(20,22,26,0.08)]" style={{ background: "rgba(244,245,247,0.86)", backdropFilter: "blur(12px)" }}>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9AA0A8]">{section}{subsection ? ` · ${subsection}` : ""}</div>
        <h1 className="mt-[2px] text-[16px] font-semibold text-[#1A1C20]">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Date range */}
        <div className="flex rounded-[8px] bg-[rgba(20,22,26,0.06)] p-[3px]">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onRangeChange(r.key)}
              className={cn(
                "px-3 py-1.5 text-[12px] font-semibold rounded-[6px] transition-colors",
                range === r.key
                  ? "bg-[#1A1C20] text-white"
                  : "text-[#646B73] hover:text-[#1A1C20]"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Notification bell */}
        <button type="button" className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-[rgba(20,22,26,0.08)] bg-white hover:bg-[#FBFBFC]">
          <Bell size={16} className="text-[#646B73]" />
          <span className="absolute top-[7px] right-[9px] h-[7px] w-[7px] rounded-full bg-[#C0392B]" />
        </button>
      </div>
    </div>
  );
}
