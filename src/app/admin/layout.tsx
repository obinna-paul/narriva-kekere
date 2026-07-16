import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminTheme } from "@/components/theme/admin-theme";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentSession } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

/**
 * The authoritative ADMIN gate for the whole /admin section — deliberately
 * not just trusting session.user.role, which is baked into the JWT at
 * sign-in and can go stale (a role granted or revoked via the admin
 * dashboard doesn't take effect in an already-issued session token). This
 * runs as a Server Component on every /admin navigation, so it can check
 * Postgres directly and always reflects the current role. Middleware
 * (src/middleware.ts) only checks that a session exists at all — it can't
 * do this DB-fresh check itself since it runs on the edge runtime, where
 * Prisma isn't available.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <AdminTheme>
      <AdminShell>{children}</AdminShell>
    </AdminTheme>
  );
}
