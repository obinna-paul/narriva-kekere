"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";

const SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Read the saved desktop collapse state after mount rather than in the
  // initializer — avoids a server/client hydration mismatch, at the cost of
  // one extra render if the user last left it collapsed.
  useEffect(() => {
    if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") setSidebarCollapsed(true);
  }, []);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] text-[#1A1C20]">
      <AdminSidebar
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        collapsed={sidebarCollapsed}
        onCollapse={toggleSidebarCollapsed}
      />
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-200",
          sidebarCollapsed ? "md:ml-0" : "md:ml-[248px]"
        )}
      >
        <AdminTopBar
          onMenuClick={() => setMobileNavOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onExpandSidebar={toggleSidebarCollapsed}
        />
        <main className="min-w-0 flex-1 px-4 py-5 md:px-[34px] md:py-[30px]">
          <div className="mx-auto max-w-[1320px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
