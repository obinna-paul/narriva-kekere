import { notFound } from "next/navigation";
import { Heading, Body } from "@/components/ui/typography";
import { getSubmissionById } from "@/lib/data/submissions";
import { getManuscriptDownloadUrl } from "@/lib/storage/r2";
import { SubmissionControls } from "@/components/admin/submission-controls";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const submission = await getSubmissionById(params.id);
  if (!submission) notFound();

  // Storage misconfiguration shouldn't take down the whole review screen —
  // degrade to a disabled-looking note instead of a 500.
  let manuscriptUrl: string | null = null;
  try {
    manuscriptUrl = await getManuscriptDownloadUrl(submission.manuscriptRef);
  } catch (error) {
    console.error("Couldn't generate manuscript download URL:", error);
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Heading as="h1" size="h2">
          {submission.manuscriptTitle}
        </Heading>
        <Body size="base" className="mt-2 text-[var(--color-ink)]/70">
          Submitted by {submission.authorName} ({submission.authorEmail}) on{" "}
          {submission.submittedAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Body>
      </div>

      <div className="rounded-lg border border-[var(--color-ink)]/10 p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/50">
              Manuscript file
            </dt>
            <dd className="mt-1">
              {manuscriptUrl ? (
                <a
                  href={manuscriptUrl}
                  className="font-medium text-[var(--color-primary)] hover:underline"
                >
                  Download / view
                </a>
              ) : (
                <span className="text-[var(--color-ink)]/50">Unavailable</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/50">
              Linked account
            </dt>
            <dd className="mt-1">
              {submission.userId ? "Linked" : "Guest submission (no account linked)"}
            </dd>
          </div>
          {submission.genre && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/50">
                Genre
              </dt>
              <dd className="mt-1">{submission.genre}</dd>
            </div>
          )}
          {submission.manuscriptStage && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/50">
                Manuscript stage
              </dt>
              <dd className="mt-1">{submission.manuscriptStage}</dd>
            </div>
          )}
          {submission.supportNeeded.length > 0 && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/50">
                Support requested
              </dt>
              <dd className="mt-1">{submission.supportNeeded.join(", ")}</dd>
            </div>
          )}
        </dl>
        {submission.synopsis && (
          <div className="mt-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/50">
              Synopsis
            </dt>
            <dd className="mt-1 text-sm text-[var(--color-ink)]/80">{submission.synopsis}</dd>
          </div>
        )}
        {submission.targetAudience && (
          <div className="mt-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink)]/50">
              Target audience
            </dt>
            <dd className="mt-1 text-sm text-[var(--color-ink)]/80">
              {submission.targetAudience}
            </dd>
          </div>
        )}
      </div>

      <SubmissionControls submission={submission} />
    </div>
  );
}
