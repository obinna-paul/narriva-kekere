import { notFound, redirect } from "next/navigation";
import { KekereTheme } from "@/components/theme";
import { StoryCompletionScreen } from "@/components/kekere/story-completion-screen";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getStoryForReader } from "@/lib/data/kekere-stories";
import { getWalletForUser } from "@/lib/data/kekere-wallet";
import { getOrCreateReferralCodeForUser } from "@/lib/data/kekere-referrals";
import { isFollowing } from "@/lib/data/kekere-follows";
import { userAvatarUrl } from "@/lib/storage/cloudinary-urls";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function KekereStoryCompletePage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/login");

  const story = await getStoryForReader(params.id, session.user.id);
  if (!story) notFound();

  const [wallet, code, tipCount, following] = await Promise.all([
    getWalletForUser(session.user.id),
    getOrCreateReferralCodeForUser(session.user.id),
    prisma.tip.count({ where: { readerId: session.user.id, storyId: params.id } }),
    isFollowing(session.user.id, story.author.id),
  ]);

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[#F5EBDD]">
        <StoryCompletionScreen
          storyId={params.id}
          storyTitle={story.title}
          authorId={story.author.id}
          authorName={story.author.name ?? "Unknown"}
          authorAvatarColor={story.author.avatarColor}
          authorAvatarUrl={story.author.avatar ? userAvatarUrl(story.author.avatar) : null}
          spendingBalance={wallet?.spendingBalance ?? 0}
          tipCount={tipCount}
          rating={0}
          referralCode={code}
          initialFollowing={following}
          isOwnStory={session.user.id === story.author.id}
        />
      </div>
    </KekereTheme>
  );
}
