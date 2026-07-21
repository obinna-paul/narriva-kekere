import { notFound } from "next/navigation";
import { KekereTheme } from "@/components/theme";
import { WriterReviewView } from "@/components/kekere/writer-review-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getWriterReview } from "@/lib/data/kekere-review-flow";

export const dynamic = "force-dynamic";

// Auth protection lives in src/middleware.ts — /kekere/review is in
// KEKERE_PROTECTED_PREFIXES, so logged-out visitors are redirected to /login.
export default async function KekereReviewPage({ params }: { params: { storyId: string } }) {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <KekereTheme>
        <div className="min-h-screen bg-[var(--color-bg)]" />
      </KekereTheme>
    );
  }

  const review = await getWriterReview(params.storyId, userId);
  // Not theirs, or nothing awaiting their approval — don't leak that the story
  // exists at all.
  if (!review) notFound();

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <WriterReviewView {...review} />
      </div>
    </KekereTheme>
  );
}
