"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface PortalTabsProps {
  header: React.ReactNode;
  submissionsView: React.ReactNode;
  productionView: React.ReactNode;
  publishedView: React.ReactNode;
  salesView: React.ReactNode;
}

export function PortalTabs({ header, submissionsView, productionView, publishedView, salesView }: PortalTabsProps) {
  const [view, setView] = useState<"submissions" | "production" | "published" | "sales">("submissions");

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-5">
        {header}
        <div className="flex gap-1 rounded-full bg-[var(--color-ink)]/5 p-1">
          <button
            type="button"
            onClick={() => setView("submissions")}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
              view === "submissions" ? "bg-white text-[var(--color-ink)]" : "bg-transparent text-[var(--color-muted-3)]"
            )}
          >
            Submissions
          </button>
          <button
            type="button"
            onClick={() => setView("production")}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
              view === "production" ? "bg-white text-[var(--color-ink)]" : "bg-transparent text-[var(--color-muted-3)]"
            )}
          >
            In production
          </button>
          <button
            type="button"
            onClick={() => setView("published")}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
              view === "published" ? "bg-white text-[var(--color-ink)]" : "bg-transparent text-[var(--color-muted-3)]"
            )}
          >
            Published
          </button>
          <button
            type="button"
            onClick={() => setView("sales")}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
              view === "sales" ? "bg-white text-[var(--color-ink)]" : "bg-transparent text-[var(--color-muted-3)]"
            )}
          >
            Sales
          </button>
        </div>
      </div>

      <div className="mt-9">
        {view === "submissions" ? submissionsView : view === "production" ? productionView : view === "published" ? publishedView : salesView}
      </div>
    </div>
  );
}
