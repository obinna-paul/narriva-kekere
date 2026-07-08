import { notFound, redirect } from "next/navigation";
import { KekereTheme } from "@/components/theme";
import { StoryCompletionScreen } from "@/components/kekere/story-completion-screen";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getStoryForReader } from "@/lib/data/kekere-stories";
import { getWalletForUser } from "@/lib/data/kekere-wallet";
import { getOrCreateReferralCodeForUser } from "@/lib/data/kekere-referrals";

export const dynamic = "force-dynamic";

export default async function KekereStoryCompletePage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/login");

  const story = await getStoryForReader(params.id, session.user.id);
  if (!story) notFound();

  const [wallet, code] = await Promise.all([
    getWalletForUser(session.user.id),
    getOrCreateReferralCodeForUser(session.user.id),
  ]);

  const alreadyTipped = wallet?.transactions.some((t) => t.type === "TIP_SENT" && t.description?.includes(params.id));

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[#F5EBDD]">
        <StoryCompletionScreen
          storyId={params.id}
          storyTitle={story.title}
          authorName={story.author.name ?? "Unknown"}
          spendingBalance={wallet?.spendingBalance ?? 0}
          tipSent={!!alreadyTipped}
          rating={0}
          referralCode={code}
          onTip={async () => {}}
          onRate={async () => {}}
        />
      </div>
    </KekereTheme>
  );
}
