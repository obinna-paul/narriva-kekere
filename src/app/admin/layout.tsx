import type { ReactNode } from "react";
import { AdminTheme } from "@/components/theme/admin-theme";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminTheme>
      <div className="flex min-h-screen bg-[#F4F5F7] text-[#1A1C20]">
        <AdminSidebar />
        <div className="ml-[248px] flex min-h-screen flex-1 flex-col">
          <AdminTopBar />
          <main className="flex-1 px-[34px] py-[30px]">
            <div className="mx-auto max-w-[1320px]">{children}</div>
          </main>
        </div>
      </div>
    </AdminTheme>
  );
}
