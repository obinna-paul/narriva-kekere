import type { ReactNode } from "react";
import { AdminTheme } from "@/components/theme/admin-theme";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminTheme>
      <AdminShell>{children}</AdminShell>
    </AdminTheme>
  );
}
