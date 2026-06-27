import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { LibraryView, type HistoryStory } from "@/components/kekere/library-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getUserLibrary, getReadingHistory } from "@/lib/data/kekere-library";
import { toFeedStoryData } from "@/lib/adapters/kekere";

export default async function KekereLibraryPage() {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  const [library, history] = userId
    ? await Promise.all([getUserLibrary(userId), getReadingHistory(userId)])
    : [{ unlockedStories: [], savedStories: [] }, [] as Awaited<ReturnType<typeof getReadingHistory>>];

  const historyStories: HistoryStory[] = history.map((h) => ({
    ...toFeedStoryData(h.story),
    completed: h.completed,
    scrollFraction: h.scrollFraction,
  }));

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNavWrapper />
        <LibraryView
          savedStories={library.savedStories.map((s) => toFeedStoryData(s))}
          unlockedStories={library.unlockedStories.map((s) => toFeedStoryData(s))}
          historyStories={historyStories}
        />
      </div>
    </KekereTheme>
  );
}
