import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { ProfileView } from "@/components/kekere/profile-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getKekereUserProfile, getReaderStats, getWriterStats } from "@/lib/data/kekere-profile-stats";
import { listStoriesByAuthor } from "@/lib/data/kekere-stories";

export const dynamic = "force-dynamic";

// Auth protection lives in src/middleware.ts (redirects logged-out visitors
// to /login); this still reads the session for the user's own data.
export default async function KekereProfilePage() {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  const [profile, writerStats, readerStats, myStories] = userId
    ? await Promise.all([
        getKekereUserProfile(userId),
        getWriterStats(userId),
        getReaderStats(userId),
        listStoriesByAuthor(userId),
      ])
    : [
        null,
        { publishedCount: 0, totalReads: 0, cowriesEarned: 0, hasAuthoredAnyStory: false },
        { storiesRead: 0, savedCount: 0 },
        [],
      ];

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNavWrapper />
        <ProfileView
          name={profile?.name ?? ""}
          email={profile?.email ?? ""}
          bio={profile?.bio ?? ""}
          avatarColor={profile?.avatarColor ?? "#C75D2C"}
          bankName={profile?.bankName ?? null}
          bankAccountNumber={profile?.bankAccountNumber ?? null}
          bankAccountName={profile?.bankAccountName ?? null}
          hasAuthoredAnyStory={writerStats.hasAuthoredAnyStory}
          writingStats={writerStats}
          readingStats={readerStats}
          myStories={myStories.map((s) => ({ id: s.id, title: s.title, status: s.status }))}
        />
      </div>
    </KekereTheme>
  );
}
