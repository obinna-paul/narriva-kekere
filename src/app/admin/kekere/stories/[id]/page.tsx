import { notFound } from "next/navigation";
import { Heading, Body } from "@/components/ui/typography";
import { getModerationQueueItem } from "@/lib/data/kekere-moderation";
import { KekereStoryDecision } from "@/components/admin/kekere-story-decision";
import { docToHtml, type TiptapDoc } from "@/lib/tiptap/doc-utils";

export const dynamic = "force-dynamic";

/**
 * Content policy reference for moderators — human judgment, not an
 * algorithm. Nothing here is enforced programmatically; it's a sidebar
 * memory aid for the people making the actual call.
 *
 * Allowed: original fiction only, 1,500-15,000 words, serialized chapters
 * okay.
 *
 * Reject: plagiarism/duplicate content, non-fiction/poetry/scripts, hate
 * speech or harassment, excessive unlabeled AI-generated text.
 *
 * Mature content allowed only if clearly labelled and age-gated
 * (age-gating UI is not built in this phase — flag as a future requirement
 * if mature content submissions start appearing).
 */
const CONTENT_POLICY = {
  allowed: ["Original fiction only", "1,500-15,000 words", "Serialized chapters okay"],
  reject: [
    "Plagiarism or duplicate content",
    "Non-fiction, poetry, or scripts",
    "Hate speech or harassment",
    "Excessive unlabeled AI-generated text",
  ],
  mature:
    "Allowed only if clearly labelled and age-gated. Age-gating UI isn't built yet — flag to the team if mature submissions start appearing.",
};

export default async function AdminKekereStoryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const story = await getModerationQueueItem(params.id);
  if (!story) notFound();

  const wordCount = story.wordCount;
  const bodyHtml = docToHtml(story.body as unknown as TiptapDoc);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div>
        <Heading as="h1" size="h2">
          {story.title}
        </Heading>
        <Body size="sm" className="mt-1 text-[var(--color-ink)]/60">
          By {story.author.name} · {wordCount.toLocaleString()} words · {story.genre}
        </Body>
        <Body size="sm" className="mt-1 text-[var(--color-ink)]/60">
          {story.hookLine}
        </Body>

        <div className="mt-6">
          <KekereStoryDecision
            storyId={story.id}
            currentTier={story.tier}
            currentCowrieCost={story.cowrieCost}
            currentPlagiarismFlagged={story.plagiarismFlagged}
          />
        </div>

        <div
          className="mt-8 flex flex-col gap-4 rounded-lg border border-[var(--color-ink)]/10 p-6 text-base leading-relaxed [&_strong]:font-bold [&_em]:italic [&_u]:underline"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>

      <aside className="flex flex-col gap-4 text-sm">
        <div className="rounded-lg border border-[var(--color-ink)]/10 p-4">
          <p className="font-semibold">Content policy</p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-emerald-700">
            Allowed
          </p>
          <ul className="mt-1 list-disc pl-4 text-[var(--color-ink)]/75">
            {CONTENT_POLICY.allowed.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-red-700">Reject</p>
          <ul className="mt-1 list-disc pl-4 text-[var(--color-ink)]/75">
            {CONTENT_POLICY.reject.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-amber-700">
            Mature content
          </p>
          <p className="mt-1 text-[var(--color-ink)]/75">{CONTENT_POLICY.mature}</p>
        </div>
        <p className="text-xs text-[var(--color-ink)]/40">
          This is human judgment, not an algorithm — nothing above is checked automatically.
        </p>
      </aside>
    </div>
  );
}
