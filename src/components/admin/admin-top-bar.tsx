"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const ROUTE_META: Record<string, { section: string; subsection?: string; title: string }> = {
  "/admin": { section: "Overview", title: "Command Center" },
  "/admin/traffic-growth": { section: "Narriva", subsection: "Analytics", title: "Traffic & Growth" },
  "/admin/book-sales": { section: "Narriva", title: "Book Sales" },
  "/admin/submissions": { section: "Narriva", title: "Manuscript Submissions" },
  "/admin/author-projects": { section: "Narriva", title: "Author Projects" },
  "/admin/nari-intelligence": { section: "Narriva", title: "Nari Intelligence" },
  "/admin/story-review": { section: "Kekere", title: "Story Review Queue" },
  "/admin/performance": { section: "Kekere", title: "Trending & Performance" },
  "/admin/competitions": { section: "Kekere", title: "Competitions" },
  "/admin/contracts": { section: "Kekere", title: "Publishing Contracts" },
  "/admin/economy": { section: "Kekere", title: "Cowrie Economy" },
  "/admin/withdrawals": { section: "Kekere", title: "Withdrawal Requests" },
  "/admin/user-analytics": { section: "Kekere", title: "User Analytics" },
  "/admin/all-users": { section: "Platform", title: "All Users" },
  "/admin/settings": { section: "Platform", title: "Settings" },
};

const RANGES = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
];

interface AdminTopBarProps {
  range?: string;
  onRangeChange?: (range: string) => void;
  showRange?: boolean;
}

export function AdminTopBar({ range = "30d", onRangeChange, showRange = true }: AdminTopBarProps) {
  const pathname = usePathname();
  const meta = ROUTE_META[pathname] ?? { section: "Admin", title: "Dashboard" };

  return (
    <header
      className="sticky top-0 z-20 flex h-[62px] items-center justify-between border-b border-[rgba(20,22,26,0.08)] px-[34px]"
      style={{ background: "rgba(244,245,247,0.86)", backdropFilter: "blur(12px)" }}
    >
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9AA0A8]">
          {meta.section}
          {meta.subsection ? ` · ${meta.subsection}` : ""}
        </div>
        <h1 className="mt-[2px] text-[16px] font-semibold text-[#1A1C20]">{meta.title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {showRange && onRangeChange && (
          <div className="flex rounded-[8px] bg-[rgba(20,22,26,0.06)] p-[3px]">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => onRangeChange(r.key)}
                className={cn(
                  "rounded-[6px] px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  range === r.key ? "bg-[#1A1C20] text-white" : "text-[#646B73] hover:text-[#1A1C20]"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-[rgba(20,22,26,0.08)] bg-white hover:bg-[#FBFBFC]"
        >
          <Bell size={16} className="text-[#646B73]" />
          <span className="absolute right-[9px] top-[7px] h-[7px] w-[7px] rounded-full bg-[#C0392B]" />
        </button>
      </div>
    </header>
  );
}
