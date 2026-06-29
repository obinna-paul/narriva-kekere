import { notFound } from "next/navigation";
import { KekereTheme } from "@/components/theme";
import { StoryReader } from "@/components/kekere/story-reader";
import { getStoryForReader } from "@/lib/data/kekere-stories";
import { isStorySaved } from "@/lib/data/kekere-library";
import { getWalletForUser } from "@/lib/data/kekere-wallet";
import { getStoryRating } from "@/lib/data/kekere-ratings";
import { toReaderStoryData } from "@/lib/adapters/kekere";
import { getCurrentSession } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

export default async function KekereStoryPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  const dbStory = await getStoryForReader(params.id, userId);
  if (!dbStory) notFound();

  const [saved, wallet, rating] = await Promise.all([
    userId ? isStorySaved(userId, params.id) : Promise.resolve(false),
    userId ? getWalletForUser(userId) : Promise.resolve(null),
    userId ? getStoryRating(userId, params.id) : Promise.resolve(null),
  ]);

  return (
    <KekereTheme>
      <StoryReader
        story={toReaderStoryData(dbStory)}
        isLoggedIn={!!userId}
        userEmail={session?.user?.email ?? undefined}
        initialUnlocked={dbStory.unlocked}
        initialBalance={wallet?.spendingBalance ?? 0}
        initialSaved={saved}
        initialRating={rating ?? undefined}
      />
    </KekereTheme>
  );
}
