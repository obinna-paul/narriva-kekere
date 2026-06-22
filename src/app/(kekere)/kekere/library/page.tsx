import { KekereTheme } from "@/components/theme";
import { KekereNav } from "@/components/kekere/kekere-nav";
import { LibraryView } from "@/components/kekere/library-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getUserLibrary } from "@/lib/data/kekere-library";
import { toFeedStoryData } from "@/lib/adapters/kekere";

export const dynamic = "force-dynamic";

// Auth protection lives in src/middleware.ts (redirects logged-out visitors
// to /login); this still reads the session to know whose library to fetch.
export default async function KekereLibraryPage() {
  const session = await getCurrentSession();
  const library = session?.user?.id
    ? await getUserLibrary(session.user.id)
    : { unlockedStories: [], savedStories: [] };

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNav />
        <LibraryView
          savedStories={library.savedStories.map((s) => toFeedStoryData(s))}
          unlockedStories={library.unlockedStories.map((s) => toFeedStoryData(s))}
        />
      </div>
    </KekereTheme>
  );
}
