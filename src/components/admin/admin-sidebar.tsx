"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  key: string;
  label: string;
  dotColor?: "narriva" | "kekere" | "neutral";
  count?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { key: "command-center", label: "Command Center", dotColor: "neutral", count: 0 },
    ],
  },
  {
    label: "Narriva",
    items: [
      { key: "traffic", label: "Traffic & Growth", dotColor: "narriva" },
      { key: "book-sales", label: "Book Sales", dotColor: "narriva" },
      { key: "submissions", label: "Submissions", dotColor: "narriva", count: 0 },
      { key: "author-projects", label: "Author Projects", dotColor: "narriva" },
      { key: "nari-intelligence", label: "Nari Intelligence", dotColor: "narriva" },
    ],
  },
  {
    label: "Kekere",
    items: [
      { key: "story-review", label: "Story Review", dotColor: "kekere", count: 0 },
      { key: "performance", label: "Performance", dotColor: "kekere" },
      { key: "competitions", label: "Competitions", dotColor: "kekere" },
      { key: "contracts", label: "Contracts", dotColor: "kekere" },
      { key: "cowrie-economy", label: "Cowrie Economy", dotColor: "kekere" },
      { key: "withdrawals", label: "Withdrawals", dotColor: "kekere", count: 0 },
      { key: "user-analytics", label: "User Analytics", dotColor: "kekere" },
    ],
  },
  {
    label: "Platform",
    items: [
      { key: "all-users", label: "All Users", dotColor: "neutral" },
      { key: "settings", label: "Settings", dotColor: "neutral" },
    ],
  },
];

const DOT_COLORS: Record<string, string> = {
  narriva: "bg-[#1E3A8A]",
  kekere: "bg-[#C75D2C]",
  neutral: "bg-[#7C828C]",
};

interface AdminSidebarProps {
  activeView: string;
  onNavigate: (key: string) => void;
  counts: Record<string, number>;
}

export function AdminSidebar({ activeView, onNavigate, counts }: AdminSidebarProps) {
  return (
    <div className="fixed left-0 top-0 bottom-0 w-[248px] flex flex-col bg-[#15171C] z-30">
      {/* Logo */}
      <div className="flex-none px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[7px] overflow-hidden">
            <div className="h-full w-1/2 bg-[#1E3A8A]" />
            <div className="h-full w-1/2 bg-[#C75D2C]" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white tracking-tight">Operations</div>
            <div className="text-[10px] text-[#7C828C] uppercase tracking-[0.06em]">Narriva · Kekere</div>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5E6470]">
              {group.label}
            </div>
            <div className="space-y-[2px]">
              {group.items.map((item) => {
                const isActive = activeView === item.key;
                const count = counts[item.key] ?? item.count;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onNavigate(item.key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[7px] px-3 py-2 text-left text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-[rgba(255,255,255,0.10)] text-white"
                        : "text-[#7C828C] hover:bg-[rgba(255,255,255,0.05)] hover:text-white"
                    )}
                  >
                    <span className={cn("h-[6px] w-[6px] flex-none rounded-full", DOT_COLORS[item.dotColor ?? "neutral"])} />
                    <span className="flex-1">{item.label}</span>
                    {count !== undefined && count > 0 && (
                      <span className={cn(
                        "flex-none rounded-full px-2 py-0.5 text-[10px] font-bold text-white",
                        item.dotColor === "kekere" ? "bg-[#C75D2C]" : "bg-[#1E3A8A]"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User chip */}
      <div className="flex-none border-t border-[rgba(255,255,255,0.06)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full bg-[#6B21A8] text-[12px] font-bold text-white">A</div>
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-white truncate">Admin</div>
            <div className="text-[10px] text-[#7C828C]">Administrator</div>
          </div>
          <span className="flex-none rounded-full bg-[#6B21A8]/20 px-2 py-0.5 text-[9px] font-semibold text-[#6B21A8]">ADMIN</span>
        </div>
      </div>
    </div>
  );
}
