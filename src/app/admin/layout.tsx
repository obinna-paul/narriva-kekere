import { AdminTheme } from "@/components/theme/admin-theme";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] font-body">
        {children}
      </div>
    </AdminTheme>
  );
}
