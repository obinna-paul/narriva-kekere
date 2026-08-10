import type { Metadata } from "next";
import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { FeedContent } from "@/components/kekere/feed-content";
import { WelcomeBonusModal } from "@/components/kekere/welcome-bonus-modal";
import {
  listStories,
  getInProgressStories,
  getRecommendedStories,
  getFeedTagRows,
  getStoriesByIds,
  countPublishedStoriesSince,
  rankStoriesBlended,
  seededUnitInterval,
} from "@/lib/data/kekere-stories";
import { getPersonalizedTagOrder, getSignatureRow, getTopGenre } from "@/lib/data/kekere-taste";
import { getUserTagPreferences } from "@/lib/data/kekere-preferences";
import { getWalletForUser } from "@/lib/data/kekere-wallet";
import { getAllWinners } from "@/lib/data/kekere-competitions";
import { getReadingProgressBatch } from "@/lib/data/kekere-progress";
import { getKekereUserProfile, getReaderStats } from "@/lib/data/kekere-profile-stats";
import { getStreakStats } from "@/lib/data/kekere-streaks";
import { getLatestFollowedWriterStory } from "@/lib/data/kekere-follows";
import { getRecentNoteReply } from "@/lib/data/kekere-notes";
import { getOrCreateReferralCodeForUser } from "@/lib/data/kekere-referrals";
import { toFeedStoryData } from "@/lib/adapters/kekere";
import { getCurrentSession } from "@/lib/auth/middleware";
import { FEED_TAG_ORDER, resolveCategoryBySlug } from "@/content/story-tags";
import { getFeedGreeting, type GreetingPersonalization } from "@/content/kekere-feed-greetings";
import type { MockStory } from "@/content/mock/kekere-stories";

const LONG_ABSENCE_DAYS = 14;
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feed",
  description: "Discover published short fiction from African writers on Kekere Stories.",
  alternates: { canonical: "/kekere/feed" },
};

export interface WinnerStory extends MockStory {
  // null for a story marked CHAMPION tier directly rather than through a
  // formal competition entry — see getAllWinners().
  placement: number | null;
  competitionTitle: string | null;
}

export interface FeedTagRow {
  slug: string;
  feedHeading: string;
  stories: MockStory[];
}

export default async function KekereFeedPage() {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  // Daily rotation key: stable for a given reader across a whole day (so the
  // order doesn't shuffle on every reload), different for every reader (so
  // two readers don't see the same spotlight story), and different again
  // tomorrow — same todaySeed idiom Editor's Pick already uses below.
  const rotationKey = `${userId ?? "anon"}:${Math.floor(Date.now() / 86400000)}`;

  // Fetch all sections in parallel
  const [
    trendingData,
    editorsPickTierData,
    winners,
    wallet,
    inProgress,
    recommended,
    tagPreferences,
    signatureRowMeta,
    profile,
    readerStats,
    streakStats,
    topGenre,
    followedWriterStory,
    recentReply,
    referralCode,
  ] = await Promise.all([
    listStories({ sort: "trending", pageSize: 12 }),
    listStories({ tier: ["FEATURED", "CHAMPION"], pageSize: 50 }),
    getAllWinners(),
    userId ? getWalletForUser(userId) : Promise.resolve(null),
    userId ? getInProgressStories(userId) : Promise.resolve([]),
    userId ? getRecommendedStories(userId, 12) : Promise.resolve([]),
    userId
      ? getUserTagPreferences(userId)
      : Promise.resolve({ explicit: [], autoDetected: [], categoryScores: new Map<string, number>() }),
    userId ? getSignatureRow(userId, 8) : Promise.resolve(null),
    userId ? getKekereUserProfile(userId) : Promise.resolve(null),
    userId ? getReaderStats(userId) : Promise.resolve(null),
    userId ? getStreakStats(userId) : Promise.resolve(null),
    userId ? getTopGenre(userId) : Promise.resolve(null),
    userId ? getLatestFollowedWriterStory(userId) : Promise.resolve(null),
    userId ? getRecentNoteReply(userId) : Promise.resolve(null),
    userId ? getOrCreateReferralCodeForUser(userId) : Promise.resolve(null),
  ]);

  // Pure/synchronous now that categoryScores is already in hand — see
  // getPersonalizedTagOrder's doc comment in kekere-taste.ts.
  const tagOrder = getPersonalizedTagOrder(FEED_TAG_ORDER, tagPreferences.categoryScores, tagPreferences.explicit);

  // "New stories since you left" needs a second query keyed off the
  // lastLoginAt fetched above — lastLoginAt only updates on sign-in, not on
  // every feed visit, so this is a proxy for "since your session started,"
  // not a literal "since you last opened this page."
  const newStoriesCount =
    userId && profile?.lastLoginAt ? await countPublishedStoriesSince(profile.lastLoginAt) : 0;

  const daysSinceLastLogin = profile?.lastLoginAt
    ? (Date.now() - profile.lastLoginAt.getTime()) / (24 * 60 * 60 * 1000)
    : null;
  const anniversaryYears = profile?.createdAt
    ? Math.floor((Date.now() - profile.createdAt.getTime()) / YEAR_MS)
    : 0;

  // The feed is a protected route (see middleware.ts), so userId and
  // profile.name are always real here — the fallback only exists to satisfy
  // the type checker's optional-session shape, not because either is
  // actually expected to be missing.
  const greetingPersonalization: GreetingPersonalization = {
    name: profile?.name ?? "",
    isFirstTime: (readerStats?.storiesCompleted ?? 0) === 0,
    isLongAbsence: daysSinceLastLogin !== null && daysSinceLastLogin >= LONG_ABSENCE_DAYS,
    continueReadingTitle: inProgress[0]?.title ?? null,
    followedWriterName: followedWriterStory?.writerName ?? null,
    topGenre,
    storiesReadCount: readerStats?.storiesRead,
    currentStreak: streakStats?.currentStreak,
    savedCount: readerStats?.savedCount,
    newStoriesCount,
    replyWriterName: recentReply?.writerName ?? null,
    anniversaryYears,
  };
  const greeting = userId && profile?.name ? getFeedGreeting(userId, greetingPersonalization) : "Welcome.";

  // Winner's Circle mixes two fundamentally different kinds of entries:
  // real competition placements (earned 1st/2nd/3rd — never randomized) and
  // admin-designated CHAMPION-tier stories with no competition attached
  // (placement === null — fine to rotate like any other pool). Only the
  // second group gets daily rotation; competition winners keep their earned
  // order and stay first, exactly as getAllWinners() returns them.
  const competitionWinners = winners.filter((w) => w.placement !== null);
  const championWinners = winners.filter((w) => w.placement === null);

  // Tag rows, the signature row, and Winner's Circle rotation all depend on
  // state resolved above, so they run as a second stage.
  const [tagRows, signatureStories, rotatedChampionIds] = await Promise.all([
    getFeedTagRows(tagOrder, 8, { categoryScores: tagPreferences.categoryScores, rotationKey }),
    signatureRowMeta ? getStoriesByIds(signatureRowMeta.storyIds) : Promise.resolve([]),
    championWinners.length > 0
      ? rankStoriesBlended(championWinners.map((w) => w.story.id), championWinners.length, { rotationKey })
      : Promise.resolve<string[]>([]),
  ]);
  const championWinnersById = new Map(championWinners.map((w) => [w.story.id, w]));
  const rotatedChampionWinners = rotatedChampionIds
    .map((id) => championWinnersById.get(id))
    .filter((w): w is (typeof championWinners)[number] => w !== undefined);
  const orderedWinners = [...competitionWinners, ...rotatedChampionWinners];

  // Fetch story data for all tag rows in parallel
  const tagStoryMaps = await Promise.all(
    tagRows.map((row) => getStoriesByIds(row.storyIds))
  );

  const trending = trendingData.stories.map((s) => toFeedStoryData(s, true));

  // Editor's Pick: pick deterministically (rotates once a day) from stories
  // an admin has marked FEATURED or CHAMPION tier — never STANDARD, and not
  // from trending. With zero eligible stories, the section simply doesn't render.
  const editorsPickPool = editorsPickTierData.stories.map((s) => toFeedStoryData(s, true));
  const todaySeed = Math.floor(Date.now() / 86400000); // changes once per day
  const featuredStory = editorsPickPool.length > 0
    ? editorsPickPool[Math.floor(seededUnitInterval(String(todaySeed)) * editorsPickPool.length)]
    : null;

  const winnerStories: WinnerStory[] = orderedWinners.map((w) => ({
    ...toFeedStoryData(w.story),
    placement: w.placement,
    competitionTitle: w.competitionTitle,
  }));

  const inProgressStories = inProgress.map((s) => toFeedStoryData(s));
  const recommendedStories = recommended.map((s) => toFeedStoryData(s));

  const feedTagRows: FeedTagRow[] = tagRows.map((row, i) => ({
    slug: row.slug,
    feedHeading: resolveCategoryBySlug(row.slug)?.title ?? row.slug,
    stories: (tagStoryMaps[i] ?? []).map((s) => toFeedStoryData(s)),
  }));

  const signatureRow: FeedTagRow | null = signatureRowMeta
    ? { slug: signatureRowMeta.slug, feedHeading: signatureRowMeta.title, stories: signatureStories.map((s) => toFeedStoryData(s)) }
    : null;

  // "We think you'll love these" and "Because you love X" are both
  // independently-computed recommendation rows (they run in parallel and
  // don't know about each other), so they can pick the same story — most
  // visibly on a small catalog. That reads as broken personalization
  // rather than two distinct picks, so dedupe between just these two: if
  // "We think you'll love these" already has a story, drop it from the
  // signature row. Nothing else participates — Trending is a legitimate
  // "popular right now" signal independent of personal taste (a story can
  // be both trending and recommended), and a tag row is the definitive
  // list for that tag, so a story never gets pulled out of the category it
  // actually belongs to.
  const recommendedIds = new Set(recommendedStories.map((s) => s.id));
  const dedupedSignatureRow: FeedTagRow | null = signatureRow
    ? { ...signatureRow, stories: signatureRow.stories.filter((s) => !recommendedIds.has(s.id)) }
    : null;

  // Collect all visible story IDs to batch-fetch reading progress
  const allStoryIds = [
    ...trending.map((s) => s.id),
    ...inProgressStories.map((s) => s.id),
    ...recommendedStories.map((s) => s.id),
    ...(dedupedSignatureRow?.stories.map((s) => s.id) ?? []),
    ...feedTagRows.flatMap((row) => row.stories.map((s) => s.id)),
  ];
  const readingProgress = userId
    ? await getReadingProgressBatch(userId, Array.from(new Set(allStoryIds)))
    : {};

  return (
    <KekereTheme>
      <KekereNavWrapper />
      <FeedContent
        trending={trending}
        featuredStory={featuredStory}
        winnerStories={winnerStories}
        inProgressStories={inProgressStories}
        recommendedStories={recommendedStories}
        signatureRow={dedupedSignatureRow}
        tagRows={feedTagRows}
        balance={wallet?.spendingBalance ?? 0}
        isLoggedIn={!!userId}
        viewerId={userId ?? null}
        viewerEmail={session?.user?.email ?? null}
        referralCode={referralCode}
        readingProgress={readingProgress}
        greeting={greeting}
        greetingUserId={userId ?? null}
        greetingPersonalization={greetingPersonalization}
      />
      {userId && <WelcomeBonusModal cowries={wallet?.spendingBalance ?? 0} />}
    </KekereTheme>
  );
}
