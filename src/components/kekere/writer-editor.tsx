"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { STORY_TIER_RANGES, type StoryTier as LowercaseTier } from "@/content/decisions";

const HOOK_LINE_LIMIT = 150;
const WORDS_PER_MINUTE = 200;
const AUTOSAVE_DEBOUNCE_MS = 2000;

type DbTier = "STANDARD" | "FEATURED" | "PREMIUM";
type Status = "DRAFT" | "SUBMITTED" | "REVIEWING" | "REVISIONS_REQUESTED" | "PUBLISHED" | "REJECTED";
type Mode = "scroll" | "chapters";

interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface WriterEditorProps {
  /** Pre-selected competition, e.g. from /write?competition=harmattan-2026. */
  competitionId?: string;
  /** The raw slug from the query string — reused verbatim when rebuilding
   * the URL after autosave creates the story; previously this rebuilt the
   * URL with the display title instead, which the page can't look a
   * competition back up by on reload. */
  competitionSlug?: string;
  competitionTitle?: string;
  competitionDeadlineLabel?: string;
  /** Continuing an existing draft, e.g. from /write?id=abc123. */
  initialStoryId?: string;
}

function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

function tierToLower(tier: DbTier): LowercaseTier {
  return tier.toLowerCase() as LowercaseTier;
}

const EDITABLE_STATUSES: Status[] = ["DRAFT", "REVISIONS_REQUESTED"];

// Draft/Submitted/Reviewing read as "in our hands, nothing to do" — the same
// teal the design uses for its one "Draft" pill example. Revisions is the
// only status that means "come back and act," so it gets the brand orange.
const STATUS_STYLES: Record<Status, string> = {
  DRAFT: "bg-[rgba(31,75,75,0.12)] text-[var(--color-accent)]",
  SUBMITTED: "bg-[rgba(31,75,75,0.12)] text-[var(--color-accent)]",
  REVIEWING: "bg-[rgba(31,75,75,0.12)] text-[var(--color-accent)]",
  REVISIONS_REQUESTED: "bg-[var(--color-primary-muted)] text-[var(--color-primary)]",
  PUBLISHED: "bg-[rgba(31,111,74,0.12)] text-[var(--color-success)]",
  REJECTED: "bg-[rgba(193,58,58,0.12)] text-[#A13A3A]",
};

const STATUS_LABELS: Record<Status, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  REVIEWING: "In review",
  REVISIONS_REQUESTED: "Revisions requested",
  PUBLISHED: "Published",
  REJECTED: "Not accepted",
};

const TIERS: DbTier[] = ["STANDARD", "FEATURED", "PREMIUM"];

export function WriterEditor({
  competitionId,
  competitionSlug,
  competitionTitle,
  competitionDeadlineLabel,
  initialStoryId,
}: WriterEditorProps) {
  const router = useRouter();

  const [storyId, setStoryId] = useState<string | null>(initialStoryId ?? null);
  const [loading, setLoading] = useState(!!initialStoryId);
  const [title, setTitle] = useState("");
  const [hookLine, setHookLine] = useState("");
  const [tier, setTier] = useState<DbTier>("STANDARD");
  const [mode, setMode] = useState<Mode>("scroll");
  const [content, setContent] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: "ch-1", title: "Chapter 1", content: "" },
  ]);
  const [status, setStatus] = useState<Status>("DRAFT");
  const [moderationNotes, setModerationNotes] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const hydrating = useRef(!!initialStoryId);

  const isEditable = EDITABLE_STATUSES.includes(status);
  const fullText = mode === "scroll" ? content : chapters.map((c) => c.content).join(" ");
  const wordCount = countWords(fullText);
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));

  // Load an existing draft when continuing from /write?id=...
  useEffect(() => {
    if (!initialStoryId) return;
    fetch(`/api/kekere/stories/${initialStoryId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(({ story }) => {
        setTitle(story.title);
        setHookLine(story.hookLine);
        setTier(story.tier);
        setStatus(story.status);
        setModerationNotes(story.moderationNotes ?? null);
        if (story.isSerialized && Array.isArray(story.chapters)) {
          setMode("chapters");
          setChapters(story.chapters);
        } else {
          setMode("scroll");
          setContent(story.body);
        }
      })
      .catch(() => {
        // Couldn't load it (not theirs, deleted, etc.) — leave the editor as
        // a blank draft rather than block on an error state.
      })
      .finally(() => {
        hydrating.current = false;
        setLoading(false);
      });
  }, [initialStoryId]);

  // Returns the saved story's id (existing or newly created) on success, or
  // null on failure — callers that need to act on the result (confirmSubmit)
  // use this return value rather than reading the `storyId` state right
  // after calling this, since the setStoryId() update below doesn't apply
  // to this closure's `storyId` until the next render.
  const saveDraft = useCallback(async (): Promise<string | null> => {
    if (!isEditable) return storyId;
    if (!title && !hookLine && wordCount === 0) return storyId;

    setSaveState("saving");

    const body = mode === "scroll" ? content : chapters.map((c) => `## ${c.title}\n\n${c.content}`).join("\n\n");
    const payload = {
      title: title || "Untitled story",
      hookLine,
      body: body || " ",
      tier,
      readingTime: readingTimeMinutes,
      isSerialized: mode === "chapters",
      chapters: mode === "chapters" ? chapters : undefined,
    };

    try {
      const res = await fetch(
        storyId ? `/api/kekere/stories/${storyId}` : "/api/kekere/stories",
        {
          method: storyId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("save failed");
      const { story } = await res.json();

      if (!storyId) {
        setStoryId(story.id);
        const params = new URLSearchParams();
        params.set("id", story.id);
        if (competitionSlug) params.set("competition", competitionSlug);
        router.replace(`/kekere/write?${params.toString()}`, { scroll: false });
      }
      setSaveState("saved");
      return story.id;
    } catch {
      setSaveState("error");
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, title, hookLine, tier, mode, content, chapters, isEditable, wordCount, readingTimeMinutes, competitionSlug]);

  // Real debounced autosave — fires AUTOSAVE_DEBOUNCE_MS after the last edit.
  useEffect(() => {
    if (hydrating.current) return; // don't save while we're still loading
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(saveDraft, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(autosaveTimer.current);
  }, [title, hookLine, tier, mode, content, chapters, saveDraft]);

  function addChapter() {
    setChapters((prev) => [
      ...prev,
      { id: `ch-${prev.length + 1}`, title: `Chapter ${prev.length + 1}`, content: "" },
    ]);
  }

  function updateChapter(id: string, patch: Partial<Chapter>) {
    setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function confirmSubmit() {
    const id = storyId ?? (await saveDraft());
    if (!id) return; // save failed — nothing to submit yet

    // Entering a competition uses its own submit endpoint, which handles
    // the DRAFT → SUBMITTED transition AND creates the CompetitionEntry in
    // one call (see submitStoryToCompetition) — the generic /submit
    // endpoint below is only for a plain (non-competition) submission.
    const res = competitionId
      ? await fetch(`/api/kekere/competitions/${competitionId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId: id }),
        })
      : await fetch(`/api/kekere/stories/${id}/submit`, { method: "POST" });

    if (res.ok) {
      setStatus("SUBMITTED");
      setJustSubmitted(true);
    }
    setConfirmOpen(false);
  }

  const savedLabel =
    saveState === "saving" ? "Saving…" : saveState === "error" ? "Couldn't save" : saveState === "saved" ? "Saved" : "";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-ink-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="sticky top-0 z-20 border-b border-[var(--color-ink)]/[0.08] bg-[var(--color-bg)]/95 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Story settings"
            className="flex-none text-[19px] text-[var(--color-ink-muted)]"
          >
            ☰
          </button>
          <Link
            href="/kekere/feed"
            className="flex-none font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--color-primary)]"
          >
            Kekere
          </Link>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled story"
            disabled={!isEditable}
            aria-label="Story title"
            className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted-3)] disabled:opacity-60"
          />
          <span
            className={cn(
              "flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold",
              STATUS_STYLES[status]
            )}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 pb-2.5">
          <span className="text-xs text-[var(--color-ink-muted-3)]">
            <AnimatePresence mode="wait">
              <motion.span
                key={savedLabel}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={saveState === "error" ? "text-[#A13A3A]" : undefined}
              >
                {isEditable ? savedLabel : ""}
              </motion.span>
            </AnimatePresence>
          </span>
          {isEditable && (
            <button
              type="button"
              disabled={!title || wordCount === 0}
              onClick={() => setConfirmOpen(true)}
              className="rounded-[8px] bg-[var(--color-primary)] px-[18px] py-[9px] text-[13.5px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-50"
            >
              {status === "REVISIONS_REQUESTED" ? "Resubmit for review" : "Submit for review"}
            </button>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-[680px] px-[22px] pb-[120px] pt-[26px]">
        {status === "REVISIONS_REQUESTED" && moderationNotes && (
          <div className="mb-6 rounded-lg border-l-4 border-[var(--color-primary)] bg-[var(--color-primary-muted)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Feedback from the editorial team</p>
            <p className="mt-1 text-sm text-[var(--color-ink)]/80">{moderationNotes}</p>
          </div>
        )}

        {status === "REJECTED" && moderationNotes && (
          <div className="mb-6 rounded-lg border-l-4 border-[#A13A3A] bg-[rgba(193,58,58,0.08)] px-4 py-3">
            <p className="text-sm font-semibold text-[#A13A3A]">Why this wasn&apos;t accepted</p>
            <p className="mt-1 text-sm text-[var(--color-ink)]/80">{moderationNotes}</p>
          </div>
        )}

        {justSubmitted && (
          <div className="mb-6 rounded-lg bg-[rgba(31,111,74,0.1)] px-4 py-3 text-sm text-[var(--color-success)]">
            Submitted. We read everything within 5–7 business days.
          </div>
        )}

        {!isEditable && !justSubmitted && (
          <p className="mb-6 text-sm text-[var(--color-ink-muted-3)]">
            This story can&apos;t be edited while it&apos;s {STATUS_LABELS[status].toLowerCase()}.
          </p>
        )}

        <fieldset disabled={!isEditable} className="contents">
          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold text-[var(--color-ink-muted-2)]">
              One sharp sentence — what makes someone read this?
            </label>
            <Input
              value={hookLine}
              onChange={(e) => setHookLine(e.target.value)}
              placeholder="Your hook line…"
              className="h-auto border-none bg-transparent px-0 font-[family-name:var(--font-display)] text-[19px] italic leading-[1.4] text-[var(--color-ink)] focus:ring-0 disabled:opacity-60"
            />
            <div className="mt-2 h-px bg-[var(--color-ink)]/[0.12]" />
            <div
              className={cn(
                "mt-2 text-right text-xs",
                hookLine.length > HOOK_LINE_LIMIT ? "text-[var(--color-primary)]" : "text-[var(--color-ink-muted-3)]"
              )}
            >
              {hookLine.length} / {HOOK_LINE_LIMIT}
            </div>
          </div>

          {mode === "scroll" ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your story…"
              rows={16}
              className="min-h-[340px] resize-none border-none bg-transparent px-0 text-[17px] leading-[1.75] text-[var(--color-ink)] focus:ring-0 disabled:opacity-60"
            />
          ) : (
            <div className="flex flex-col gap-8">
              {chapters.map((chapter) => (
                <div key={chapter.id}>
                  <Input
                    value={chapter.title}
                    onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                    className="h-auto border-none bg-transparent px-0 font-[family-name:var(--font-display)] text-lg font-semibold focus:ring-0"
                  />
                  <Textarea
                    value={chapter.content}
                    onChange={(e) => updateChapter(chapter.id, { content: e.target.value })}
                    placeholder="Start writing this chapter…"
                    rows={10}
                    className="mt-2 resize-none border-none bg-transparent px-0 text-[17px] leading-[1.75] focus:ring-0"
                  />
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addChapter} className="self-start">
                Add chapter
              </Button>
            </div>
          )}
        </fieldset>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-[15] border-t border-[var(--color-ink)]/[0.08] bg-[var(--color-bg)]/95 py-[13px] text-center backdrop-blur-md">
        <span className="text-[13px] text-[var(--color-ink-muted-2)]">
          {wordCount} words · ~{readingTimeMinutes} min read
        </span>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left">
          <div className="mb-7 flex items-center justify-between">
            <span className="font-[family-name:var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">
              Story settings
            </span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close"
              className="text-xl text-[var(--color-ink-muted-2)]"
            >
              ×
            </button>
          </div>

          <div className="mb-3.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">
            Tier
          </div>
          <div className="mb-[30px] flex flex-col gap-2.5">
            {TIERS.map((t) => {
              const active = tier === t;
              const [min, max] = STORY_TIER_RANGES[tierToLower(t)];
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!isEditable}
                  onClick={() => setTier(t)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border-[1.5px] px-4 py-3.5 text-left transition-colors disabled:opacity-60",
                    active
                      ? "border-[var(--color-primary)] bg-[rgba(199,93,44,0.06)]"
                      : "border-[var(--color-ink)]/[0.12] bg-[var(--color-surface)]"
                  )}
                >
                  <div>
                    <div className="text-[15px] font-semibold text-[var(--color-ink)]">
                      {t[0] + t.slice(1).toLowerCase()}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--color-ink-muted-2)]">
                      {min}–{max} cowries to unlock
                    </div>
                  </div>
                  <span
                    className={cn(
                      "h-[18px] w-[18px] flex-none rounded-full border-[1.5px]",
                      active ? "border-[var(--color-primary)] bg-[var(--color-primary)]" : "border-[var(--color-ink)]/25 bg-transparent"
                    )}
                  />
                </button>
              );
            })}
          </div>

          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">
            Format
          </div>
          <div className="mb-[30px] flex rounded-md bg-[var(--color-ink)]/[0.06] p-1">
            {(["scroll", "chapters"] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={!isEditable}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 rounded-sm py-1.5 text-sm font-medium capitalize transition-colors disabled:opacity-60",
                  mode === m ? "bg-[var(--color-bg)] shadow-sm" : "text-[var(--color-ink-muted-2)]"
                )}
              >
                {m === "scroll" ? "Single scroll" : "Chapters"}
              </button>
            ))}
          </div>

          {competitionTitle && (
            <>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">
                Competition
              </div>
              <div className="rounded-xl border border-[var(--color-ink)]/10 bg-[var(--color-surface)] px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-[4px] bg-[var(--color-primary)] text-[10px] text-white"
                  >
                    ✓
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-ink)]">{competitionTitle}</div>
                    {competitionDeadlineLabel && (
                      <div className="text-xs text-[var(--color-ink-muted-2)]">{competitionDeadlineLabel}</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false} className="max-w-[360px] rounded-[20px] p-[30px_26px]">
          <DialogHeader className="mb-0 pr-0">
            <DialogTitle className="font-[family-name:var(--font-display)] text-[25px] font-semibold text-[var(--color-ink)]">
              Ready for other eyes?
            </DialogTitle>
            <DialogDescription className="mt-3.5 text-[15px] leading-[1.6] text-[var(--color-ink-muted)]">
              Submitting doesn&apos;t mean it&apos;s perfect — it means you want feedback that&apos;s
              better than your own. We read everything that comes in, properly, within 5–7
              business days.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-[26px] flex-row gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className={cn(buttonVariants({ variant: "secondary" }), "flex-1 rounded-[10px]")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmSubmit}
              className={cn(buttonVariants({ variant: "primary" }), "flex-1 rounded-[10px]")}
            >
              Submit
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
