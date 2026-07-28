import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { PreferencesView } from "@/components/kekere/preferences-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getUserTagPreferences } from "@/lib/data/kekere-preferences";

export const dynamic = "force-dynamic";

// Auth protection lives in src/middleware.ts (redirects logged-out visitors
// to /login).
export default async function KekerePreferencesPage() {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  const { explicit, autoDetected } = userId
    ? await getUserTagPreferences(userId)
    : { explicit: [], autoDetected: [] };

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNavWrapper />
        <PreferencesView initialExplicit={explicit} initialAutoDetected={autoDetected} />
      </div>
    </KekereTheme>
  );
}
