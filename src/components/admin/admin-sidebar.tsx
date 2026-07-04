"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  href: string;
  label: string;
  dotColor: "narriva" | "kekere" | "neutral";
  countKey?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Command Center", dotColor: "neutral" }],
  },
  {
    label: "Narriva",
    items: [
      { href: "/admin/traffic-growth", label: "Traffic & Growth", dotColor: "narriva" },
      { href: "/admin/book-sales", label: "Book Sales", dotColor: "narriva" },
      { href: "/admin/submissions", label: "Submissions", dotColor: "narriva", countKey: "submissionsPending" },
      { href: "/admin/author-projects", label: "Author Projects", dotColor: "narriva" },
      { href: "/admin/nari-intelligence", label: "Nari Intelligence", dotColor: "narriva", countKey: "nariHighIntentUnread" },
    ],
  },
  {
    label: "Kekere",
    items: [
      { href: "/admin/story-review", label: "Story Review", dotColor: "kekere", countKey: "storiesAwaitingReview" },
      { href: "/admin/publish-story", label: "Publish Story", dotColor: "kekere" },
      { href: "/admin/performance", label: "Performance", dotColor: "kekere" },
      { href: "/admin/competitions", label: "Competitions", dotColor: "kekere" },
      { href: "/admin/contracts", label: "Contracts", dotColor: "kekere" },
      { href: "/admin/economy", label: "Cowrie Economy", dotColor: "kekere" },
      { href: "/admin/withdrawals", label: "Withdrawals", dotColor: "kekere", countKey: "withdrawalsPending" },
      { href: "/admin/user-analytics", label: "User Analytics", dotColor: "kekere" },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/all-users", label: "All Users", dotColor: "neutral" },
      { href: "/admin/settings", label: "Settings", dotColor: "neutral" },
    ],
  },
];

const DOT_COLORS: Record<string, string> = {
  narriva: "bg-[#1E3A8A]",
  kekere: "bg-[#C75D2C]",
  neutral: "bg-[#7C828C]",
};

function isActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/admin/command-center")
      .then((r) => r.json())
      .then((d) => {
        if (d?.pendingActionsBreakdown) setCounts(d.pendingActionsBreakdown);
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col bg-[#15171C]">
      {/* Logo lockup */}
      <div className="flex-none px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-[30px] w-[30px] flex-none overflow-hidden rounded-[7px]">
            <div className="h-full w-1/2 bg-[#1E3A8A]" />
            <div className="h-full w-1/2 bg-[#C75D2C]" />
          </div>
          <div>
            <div className="text-[13px] font-semibold tracking-tight text-white">Operations</div>
            <div className="text-[10px] uppercase tracking-[0.06em] text-[#7C828C]">Narriva · Kekere</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5E6470]">
              {group.label}
            </div>
            <div className="space-y-[2px]">
              {group.items.map((item) => {
                const active = isActive(item.href, pathname);
                const count = item.countKey ? (counts[item.countKey] ?? 0) : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[7px] px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-[rgba(255,255,255,0.10)] text-white"
                        : "text-[#7C828C] hover:bg-[rgba(255,255,255,0.05)] hover:text-white"
                    )}
                  >
                    <span className={cn("h-[6px] w-[6px] flex-none rounded-full", DOT_COLORS[item.dotColor])} />
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "flex-none rounded-full px-2 py-0.5 text-[10px] font-bold text-white",
                          item.dotColor === "kekere" ? "bg-[#C75D2C]" : "bg-[#1E3A8A]"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User chip */}
      <div className="flex-none border-t border-[rgba(255,255,255,0.06)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full bg-[#6B21A8] text-[12px] font-bold text-white">
            A
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12px] font-medium text-white">Admin</div>
            <div className="text-[10px] text-[#7C828C]">Administrator</div>
          </div>
          <span className="flex-none rounded-full bg-[#6B21A8]/20 px-2 py-0.5 text-[9px] font-semibold text-[#6B21A8]">
            ADMIN
          </span>
        </div>
      </div>
    </aside>
  );
}
