"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, PenLine } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { isWordCountEligible, wordCountRangeLabel } from "@/lib/competitions/word-count";

interface DraftStory {
  id: string;
  title: string;
  hookLine: string | null;
  status: string;
  wordCount: number;
}

export interface CompetitionApplyProps {
  competitionId: string;
  competitionSlug: string;
  competitionTitle: string;
  wordCountLimit: number;
  wordCountMin?: number;
}

export function CompetitionApply({
  competitionId,
  competitionSlug,
  competitionTitle,
  wordCountLimit,
  wordCountMin,
}: CompetitionApplyProps) {
  const rangeLabel = wordCountRangeLabel(wordCountMin, wordCountLimit);
  const [entered, setEntered] = useState(false);

  const [draftsOpen, setDraftsOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftStory[] | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [draftSubmitting, setDraftSubmitting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  async function openDraftPicker() {
    setDraftsOpen(true);
    setDraftError(null);
    if (drafts) return;
    try {
      const res = await fetch("/api/kekere/stories/mine");
      const { stories } = await res.json();
      // DRAFT only — a published story can't be entered, and neither can one
      // already sitting with the editorial team. The backend enforces this
      // too (submitStoryToCompetition); filtering here just means the writer
      // never sees an option that would be rejected.
      setDrafts((stories as DraftStory[]).filter((s) => s.status === "DRAFT"));
    } catch {
      setDrafts([]);
      setDraftError("Couldn't load your drafts. Try again.");
    }
  }

  async function submitDraft() {
    if (!selectedDraftId) return;
    setDraftSubmitting(true);
    setDraftError(null);
    try {
      const res = await fetch(`/api/kekere/competitions/${competitionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: selectedDraftId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDraftError(body.error ?? "Couldn't submit that story. Try again.");
        return;
      }
      setDraftsOpen(false);
      setEntered(true);
    } finally {
      setDraftSubmitting(false);
    }
  }

  if (entered) {
    return (
      <div className="rounded-xl bg-[var(--color-success)]/10 px-4 py-[17px] text-center text-[14px] leading-[1.55] text-[var(--color-success)]">
        <span className="font-semibold">You&apos;re entered.</span> Our editors read every entry — if
        yours is accepted, it goes live on Kekere with a Longlist badge and is in the running for the
        prize. You can enter another story any time.{" "}
        <Link href={`/kekere/write?competition=${competitionSlug}`} className="underline">
          Your stories →
        </Link>
      </div>
    );
  }

  const hasNoDrafts = drafts !== null && drafts.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={openDraftPicker}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-[15px] text-[15px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)]"
      >
        <FileText size={16} />
        Enter a story
      </button>

      <Sheet open={draftsOpen} onOpenChange={setDraftsOpen}>
        <SheetContent side="bottom" className="flex max-h-[80vh] flex-col gap-0 p-0">
          <div className="flex-none border-b border-[var(--color-border)] px-5 py-4">
            <span className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-[var(--color-ink)]">
              Choose a story to enter
            </span>
            <p className="mt-1 text-[13px] leading-[1.5] text-[var(--color-ink)]/[0.55]">
              Pick a finished draft you haven&apos;t submitted for review yet. Already-published
              stories aren&apos;t eligible — entries have to be new work. You can enter as many
              stories as you like.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            {drafts === null && (
              <p className="py-8 text-center text-[13.5px] text-[var(--color-ink)]/50">Loading your drafts…</p>
            )}

            {hasNoDrafts && (
              <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                <PenLine size={22} className="text-[var(--color-ink)]/35" />
                <p className="text-[14px] font-semibold text-[var(--color-ink)]">
                  You don&apos;t have any drafts yet
                </p>
                <p className="text-[13px] leading-[1.5] text-[var(--color-ink)]/[0.55]">
                  Write your story first — then come back and enter it. Entries need to be{" "}
                  {rangeLabel} words.
                </p>
                <Link
                  href={`/kekere/write?new=1&competition=${competitionSlug}`}
                  className="mt-1 rounded-[10px] bg-[var(--color-primary)] px-4 py-2.5 text-[13.5px] font-semibold text-white"
                >
                  Start writing
                </Link>
              </div>
            )}

            {drafts?.map((story) => {
              const ineligible = !isWordCountEligible(story.wordCount, wordCountMin, wordCountLimit);
              const selected = selectedDraftId === story.id;
              return (
                <button
                  key={story.id}
                  type="button"
                  disabled={ineligible}
                  onClick={() => setSelectedDraftId(story.id)}
                  className={cn(
                    "mb-2 flex w-full flex-col rounded-[11px] border px-4 py-3 text-left transition-colors disabled:opacity-50",
                    selected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/[0.06]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)]"
                  )}
                >
                  <span className="text-[14.5px] font-semibold text-[var(--color-ink)]">
                    {story.title || "Untitled story"}
                  </span>
                  <span className="mt-0.5 text-[12.5px] text-[var(--color-ink)]/50">
                    {story.wordCount.toLocaleString()} words
                    {ineligible && ` — outside the ${rangeLabel}-word range`}
                  </span>
                </button>
              );
            })}
          </div>

          {draftError && (
            <p className="flex-none px-5 pb-2 text-center text-[13px] text-red-600">{draftError}</p>
          )}

          {!hasNoDrafts && (
            <div className="flex-none border-t border-[var(--color-border)] px-5 py-4">
              <p className="mb-3 text-[11.5px] leading-[1.5] text-[var(--color-ink)]/50">
                By entering the {competitionTitle}, you confirm this is your own original work and
                that it hasn&apos;t been published anywhere else. If it&apos;s accepted, it will be
                published on Kekere as a competition entry under the publishing agreement and the
                competition terms.
              </p>
              <button
                type="button"
                disabled={!selectedDraftId || draftSubmitting}
                onClick={submitDraft}
                className="w-full rounded-[10px] bg-[var(--color-primary)] py-3 text-[14.5px] font-semibold text-white disabled:opacity-50"
              >
                {draftSubmitting ? "Entering…" : "Enter this story"}
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
