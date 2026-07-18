import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { ProfileView } from "@/components/kekere/profile-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getKekereUserProfile, getReaderStats, getWriterStats } from "@/lib/data/kekere-profile-stats";
import { getWriterBankDetails } from "@/lib/data/kekere-bank-details";
import { getStreakStats } from "@/lib/data/kekere-streaks";
import { userAvatarUrl } from "@/lib/storage/cloudinary";

export const dynamic = "force-dynamic";

// Auth protection lives in src/middleware.ts (redirects logged-out visitors
// to /login); this still reads the session for the user's own data.
export default async function KekereProfilePage() {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  const [profile, writerStats, readerStats, bankDetails, streakStats] = userId
    ? await Promise.all([
        getKekereUserProfile(userId),
        getWriterStats(userId),
        getReaderStats(userId),
        getWriterBankDetails(userId),
        getStreakStats(userId),
      ])
    : [
        null,
        { publishedCount: 0, totalReads: 0, hasAuthoredAnyStory: false },
        { storiesRead: 0, storiesCompleted: 0, savedCount: 0 },
        null,
        { currentStreak: 0, longestStreak: 0, hasAnyActivity: false, activeToday: false },
      ];

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNavWrapper />
        <ProfileView
          userId={userId ?? ""}
          name={profile?.name ?? ""}
          email={profile?.email ?? ""}
          bio={profile?.bio ?? ""}
          country={profile?.country ?? null}
          avatarColor={profile?.avatarColor ?? "#C75D2C"}
          avatarUrl={profile?.avatar ? userAvatarUrl(profile.avatar) : null}
          socialLinks={profile?.socialLinks ?? []}
          bankDetails={bankDetails}
          hasAuthoredAnyStory={writerStats.hasAuthoredAnyStory}
          writingStats={writerStats}
          readingStats={readerStats}
          streakStats={streakStats}
        />
      </div>
    </KekereTheme>
  );
}
