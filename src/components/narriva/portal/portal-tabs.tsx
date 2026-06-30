"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tab = "overview" | "progress" | "deliverables" | "communication" | "documents" | "book-info";

interface PortalTabsProps {
  defaultTab?: Tab;
  pendingReviewCount: number;
  isPublished: boolean;
  overview: ReactNode;
  progress: ReactNode;
  deliverables: ReactNode;
  communication: ReactNode;
  documents: ReactNode;
  bookInfo: ReactNode;
}

const TABS: Array<{ key: Tab; label: string; showBadge?: boolean; lockIcon?: boolean }> = [
  { key: "overview", label: "Overview" },
  { key: "progress", label: "Progress" },
  { key: "deliverables", label: "Deliverables", showBadge: true },
  { key: "communication", label: "Communication" },
  { key: "documents", label: "Documents" },
  { key: "book-info", label: "Book Info", lockIcon: true },
];

export function PortalTabs({
  defaultTab = "overview",
  pendingReviewCount,
  isPublished,
  overview,
  progress,
  deliverables,
  communication,
  documents,
  bookInfo,
}: PortalTabsProps) {
  const [active, setActive] = useState<Tab>(defaultTab);

  return (
    <div>
      {/* Tab bar — underline style */}
      <div className="flex border-b border-[rgba(22,22,22,0.10)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={cn(
              "relative flex items-center gap-2 px-5 py-3.5 text-[14px] font-medium transition-colors",
              active === t.key
                ? "text-[#1E3A8A]"
                : "text-[#8A857C] hover:text-[#55514A]"
            )}
          >
            {t.label}
            {t.showBadge && pendingReviewCount > 0 && (
              <span className="flex-none rounded-full bg-[#C75D2C] px-2 py-0.5 text-[10px] font-bold text-white">{pendingReviewCount}</span>
            )}
            {t.lockIcon && !isPublished && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#8A857C]"><rect x="2" y="6" width="8" height="4.5" rx="1" stroke="currentColor" strokeWidth="1"/><path d="M3.5 6V4a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1"/></svg>
            )}
            {active === t.key && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1E3A8A]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-8">
        {active === "overview" && overview}
        {active === "progress" && progress}
        {active === "deliverables" && deliverables}
        {active === "communication" && communication}
        {active === "documents" && documents}
        {active === "book-info" && bookInfo}
      </div>
    </div>
  );
}
