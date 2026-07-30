import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { KekereTheme } from "@/components/theme";
import { WriterReviewView } from "@/components/kekere/writer-review-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getWriterReview } from "@/lib/data/kekere-review-flow";
import type { StoryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/** What to say when a review link is revisited after there's nothing left to
 * review — most often the writer already submitted their decision and is
 * reopening the same link/email/notification. Distinct per status so the
 * message stays accurate instead of a one-size-fits-all "done". */
function alreadyHandledCopy(status: StoryStatus): { heading: string; body: string; ctaLabel: string; ctaHref: string } {
  if (status === "PENDING_CONTRACT") {
    return {
      heading: "Nothing more to do here",
      body: "Your feedback is in — head over to sign your publishing contract.",
      ctaLabel: "Go to your contract",
      ctaHref: "/kekere/contracts",
    };
  }
  if (status === "PUBLISHED") {
    return {
      heading: "This story's already live",
      body: "There's nothing left to review — it's already been published.",
      ctaLabel: "Back to the feed",
      ctaHref: "/kekere/feed",
    };
  }
  return {
    heading: "Nothing more to do here",
    body: "Your feedback is now with your editor.",
    ctaLabel: "Back to the feed",
    ctaHref: "/kekere/feed",
  };
}

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

  const result = await getWriterReview(params.storyId, userId);

  // Not theirs, or doesn't exist — don't leak that the story exists at all.
  if (result.kind === "not_found") notFound();

  if (result.kind === "already_handled") {
    const copy = alreadyHandledCopy(result.status);
    return (
      <KekereTheme>
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6">
          <div className="max-w-[380px] text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(31,138,91,0.12)] text-[#1F8A5B]">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-ink)]">{copy.heading}</h1>
            <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-[var(--color-ink-muted)]">{copy.body}</p>
            <Link
              href={copy.ctaHref}
              className="mt-6 inline-block rounded-xl bg-[var(--color-primary)] px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)]"
            >
              {copy.ctaLabel}
            </Link>
          </div>
        </div>
      </KekereTheme>
    );
  }

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <WriterReviewView {...result.review} />
      </div>
    </KekereTheme>
  );
}
