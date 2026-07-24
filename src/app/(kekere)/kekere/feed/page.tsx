import type { Metadata } from "next";
import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { FeedContent } from "@/components/kekere/feed-content";
import { FirstStoryFreeModal } from "@/components/kekere/FirstStoryFreeModal";
import {
  listStories,
  getInProgressStories,
  getRecommendedStories,
  getFeedTagRows,
  getStoriesByIds,
  hasFreeReadAvailable,
  countPublishedStoriesSince,
} from "@/lib/data/kekere-stories";
import { getPersonalizedTagOrder, getSignatureRow, getTopGenre } from "@/lib/data/kekere-taste";
import { getWalletForUser } from "@/lib/data/kekere-wallet";
import { getAllWinners } from "@/lib/data/kekere-competitions";
import { getReadingProgressBatch } from "@/lib/data/kekere-progress";
import { getKekereUserProfile, getReaderStats } from "@/lib/data/kekere-profile-stats";
import { getStreakStats } from "@/lib/data/kekere-streaks";
import { getLatestFollowedWriterStory } from "@/lib/data/kekere-follows";
import { getRecentNoteReply } from "@/lib/data/kekere-notes";
import { toFeedStoryData } from "@/lib/adapters/kekere";
import { getCurrentSession } from "@/lib/auth/middleware";
import { FEED_TAG_ORDER, resolveCategoryBySlug, type StoryTagSlug } from "@/content/story-tags";
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

  // Fetch all sections in parallel
  const [
    trendingData,
    editorsPickTierData,
    winners,
    wallet,
    inProgress,
    recommended,
    tagOrder,
    signatureRowMeta,
    firstReadFree,
    profile,
    readerStats,
    streakStats,
    topGenre,
    followedWriterStory,
    recentReply,
  ] = await Promise.all([
    listStories({ sort: "trending", pageSize: 12 }),
    listStories({ tier: ["FEATURED", "CHAMPION"], pageSize: 50 }),
    getAllWinners(),
    userId ? getWalletForUser(userId) : Promise.resolve(null),
    userId ? getInProgressStories(userId) : Promise.resolve([]),
    userId ? getRecommendedStories(userId, 12) : Promise.resolve([]),
    userId ? getPersonalizedTagOrder(userId, FEED_TAG_ORDER) : Promise.resolve<StoryTagSlug[]>([...FEED_TAG_ORDER]),
    userId ? getSignatureRow(userId, 8) : Promise.resolve(null),
    hasFreeReadAvailable(userId),
    userId ? getKekereUserProfile(userId) : Promise.resolve(null),
    userId ? getReaderStats(userId) : Promise.resolve(null),
    userId ? getStreakStats(userId) : Promise.resolve(null),
    userId ? getTopGenre(userId) : Promise.resolve(null),
    userId ? getLatestFollowedWriterStory(userId) : Promise.resolve(null),
    userId ? getRecentNoteReply(userId) : Promise.resolve(null),
  ]);

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

  // Tag rows and the signature row both depend on the (possibly
  // personalized) tag order resolved above, so they run as a second stage.
  const [tagRows, signatureStories] = await Promise.all([
    getFeedTagRows(tagOrder, 8),
    signatureRowMeta ? getStoriesByIds(signatureRowMeta.storyIds) : Promise.resolve([]),
  ]);

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
    ? editorsPickPool[todaySeed % editorsPickPool.length]
    : null;

  const winnerStories: WinnerStory[] = winners.map((w) => ({
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
        firstReadFree={firstReadFree}
        readingProgress={readingProgress}
        greeting={greeting}
        greetingUserId={userId ?? null}
        greetingPersonalization={greetingPersonalization}
      />
      <FirstStoryFreeModal />
    </KekereTheme>
  );
}
