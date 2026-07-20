import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { SettingsView } from "@/components/kekere/settings-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// Auth protection lives in src/middleware.ts (redirects logged-out visitors
// to /login).
export default async function KekereSettingsPage() {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, deletionRequestedAt: true, emailNotificationsEnabled: true },
      })
    : null;

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNavWrapper />
        <SettingsView
          name={user?.name ?? ""}
          email={user?.email ?? ""}
          initialDeletionRequestedAt={user?.deletionRequestedAt?.toISOString() ?? null}
          initialEmailNotificationsEnabled={user?.emailNotificationsEnabled ?? true}
        />
      </div>
    </KekereTheme>
  );
}
