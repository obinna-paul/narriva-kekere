import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { FeedContent } from "@/components/kekere/feed-content";
import { listStories } from "@/lib/data/kekere-stories";
import { getWalletForUser } from "@/lib/data/kekere-wallet";
import { getAllWinners } from "@/lib/data/kekere-competitions";
import { toFeedStoryData } from "@/lib/adapters/kekere";
import { getCurrentSession } from "@/lib/auth/middleware";
import type { MockStory } from "@/content/mock/kekere-stories";

export const dynamic = "force-dynamic";

export interface WinnerStory extends MockStory {
  placement: number;
  competitionTitle: string;
}

export default async function KekereFeedPage() {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  const [allData, trendingData, winners, wallet] = await Promise.all([
    listStories({ pageSize: 30 }),
    listStories({ sort: "trending", pageSize: 1 }),
    getAllWinners(),
    userId ? getWalletForUser(userId) : Promise.resolve(null),
  ]);

  const allStories = allData.stories.map((s) => toFeedStoryData(s));
  const trending = trendingData.stories.map((s) => toFeedStoryData(s));
  const featuredStory = trending[0] ?? null;

  const winnerStories: WinnerStory[] = winners.map((w) => ({
    ...toFeedStoryData(w.story),
    placement: w.placement,
    competitionTitle: w.competitionTitle,
  }));

  return (
    <KekereTheme>
      <KekereNavWrapper />
      <FeedContent
        allStories={allStories}
        featuredStory={featuredStory}
        winnerStories={winnerStories}
        balance={wallet?.balance ?? 0}
      />
    </KekereTheme>
  );
}