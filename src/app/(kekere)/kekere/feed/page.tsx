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
} from "@/lib/data/kekere-stories";
import { getWalletForUser } from "@/lib/data/kekere-wallet";
import { getAllWinners } from "@/lib/data/kekere-competitions";
import { getReadingProgressBatch } from "@/lib/data/kekere-progress";
import { toFeedStoryData } from "@/lib/adapters/kekere";
import { getCurrentSession } from "@/lib/auth/middleware";
import { FEED_TAG_ORDER, resolveCategoryBySlug } from "@/content/story-tags";
import type { MockStory } from "@/content/mock/kekere-stories";

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
  const [trendingData, featuredTierData, winners, wallet, inProgress, recommended, tagRows, firstReadFree] = await Promise.all([
    listStories({ sort: "trending", pageSize: 12 }),
    listStories({ tier: "FEATURED", pageSize: 50 }),
    getAllWinners(),
    userId ? getWalletForUser(userId) : Promise.resolve(null),
    userId ? getInProgressStories(userId) : Promise.resolve([]),
    userId ? getRecommendedStories(userId, 12) : Promise.resolve([]),
    getFeedTagRows(FEED_TAG_ORDER, 8),
    hasFreeReadAvailable(userId),
  ]);

  // Fetch story data for all tag rows in parallel
  const tagStoryMaps = await Promise.all(
    tagRows.map((row) => getStoriesByIds(row.storyIds))
  );

  const trending = trendingData.stories.map((s) => toFeedStoryData(s, true));

  // Featured Today: pick deterministically (rotates once a day) from stories
  // an admin has explicitly marked FEATURED tier — not from trending. With
  // zero FEATURED stories, the section simply doesn't render.
  const featuredPool = featuredTierData.stories.map((s) => toFeedStoryData(s, true));
  const todaySeed = Math.floor(Date.now() / 86400000); // changes once per day
  const featuredStory = featuredPool.length > 0
    ? featuredPool[todaySeed % featuredPool.length]
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

  // Collect all visible story IDs to batch-fetch reading progress
  const allStoryIds = [
    ...trending.map((s) => s.id),
    ...inProgressStories.map((s) => s.id),
    ...recommendedStories.map((s) => s.id),
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
        tagRows={feedTagRows}
        balance={wallet?.spendingBalance ?? 0}
        isLoggedIn={!!userId}
        firstReadFree={firstReadFree}
        readingProgress={readingProgress}
      />
      <FirstStoryFreeModal />
    </KekereTheme>
  );
}
