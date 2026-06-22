"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label, Body } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const HOOK_LINE_NUDGE_LENGTH = 90;
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

const STATUS_STYLES: Record<Status, string> = {
  DRAFT: "bg-[var(--color-ink)]/10 text-[var(--color-ink)]/70",
  SUBMITTED: "bg-amber-100 text-amber-800",
  REVIEWING: "bg-amber-100 text-amber-800",
  REVISIONS_REQUESTED: "bg-orange-100 text-orange-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<Status, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  REVIEWING: "In review",
  REVISIONS_REQUESTED: "Revisions requested",
  PUBLISHED: "Published",
  REJECTED: "Not accepted",
};

export function WriterEditor({
  competitionId,
  competitionSlug,
  competitionTitle,
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

  if (loading) {
    return <div className="mx-auto max-w-2xl px-5 py-8 text-sm text-[var(--color-ink)]/50">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 pb-28 sm:px-8 md:pb-12">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
            STATUS_STYLES[status]
          )}
        >
          {STATUS_LABELS[status]}
        </span>
        <div className="flex items-center gap-3 text-xs text-[var(--color-ink)]/50">
          <AnimatePresence mode="wait">
            {saveState !== "idle" && isEditable && (
              <motion.span
                key={saveState}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={saveState === "error" ? "text-red-600" : undefined}
              >
                {saveState === "saving" ? "Saving…" : saveState === "error" ? "Couldn't save" : "Saved"}
              </motion.span>
            )}
          </AnimatePresence>
          <span>{wordCount} words</span>
          <span>~{readingTimeMinutes} min read</span>
        </div>
      </div>

      {status === "REVISIONS_REQUESTED" && moderationNotes && (
        <div className="mt-4 rounded-lg border-l-4 border-orange-400 bg-orange-50 px-4 py-3">
          <p className="text-sm font-semibold text-orange-900">Feedback from the editorial team</p>
          <Body size="sm" className="mt-1 text-orange-800">
            {moderationNotes}
          </Body>
        </div>
      )}

      {status === "REJECTED" && moderationNotes && (
        <div className="mt-4 rounded-lg border-l-4 border-red-400 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-900">Why this wasn&apos;t accepted</p>
          <Body size="sm" className="mt-1 text-red-800">
            {moderationNotes}
          </Body>
        </div>
      )}

      {justSubmitted && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Submitted. We read everything within 5-7 business days.
        </div>
      )}

      {competitionTitle && (
        <div className="mt-4 rounded-lg bg-[var(--color-primary)]/10 px-4 py-2 text-sm font-medium text-[var(--color-primary)]">
          Submitting for: {competitionTitle}
        </div>
      )}

      {!isEditable && (
        <p className="mt-4 text-sm text-[var(--color-ink)]/50">
          This story can&apos;t be edited while it&apos;s {STATUS_LABELS[status].toLowerCase()}.
        </p>
      )}

      <fieldset disabled={!isEditable} className="contents">
        <div className="mt-6 flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled story"
            className="border-none bg-transparent px-0 text-2xl font-bold focus-visible:ring-0 disabled:opacity-60"
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="hookLine">Hook line</Label>
            <span
              className={cn(
                "text-xs",
                hookLine.length > HOOK_LINE_NUDGE_LENGTH
                  ? "text-amber-600"
                  : "text-[var(--color-ink)]/40"
              )}
            >
              {hookLine.length}/{HOOK_LINE_NUDGE_LENGTH}
            </span>
          </div>
          <Input
            id="hookLine"
            value={hookLine}
            onChange={(e) => setHookLine(e.target.value)}
            placeholder="One sharp sentence that makes someone stop scrolling."
          />
          {hookLine.length > HOOK_LINE_NUDGE_LENGTH && (
            <p className="text-xs text-amber-600">
              Sharper is shorter — most hook lines that work are under {HOOK_LINE_NUDGE_LENGTH} characters.
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tier">Tier</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as DbTier)}>
              <SelectTrigger id="tier">
                <SelectValue>{tier[0] + tier.slice(1).toLowerCase()}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(["STANDARD", "FEATURED", "PREMIUM"] as const).map((t) => {
                  const [min, max] = STORY_TIER_RANGES[tierToLower(t)];
                  return (
                    <SelectItem key={t} value={t}>
                      {t[0] + t.slice(1).toLowerCase()} ({min}-{max} cowries)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label as="span">Writing mode</Label>
            <div className="flex rounded-md bg-[var(--color-ink)]/[0.06] p-1">
              {(["scroll", "chapters"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={!isEditable}
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 rounded-sm py-1.5 text-sm font-medium capitalize transition-colors",
                    mode === m ? "bg-[var(--color-bg)] shadow-sm" : "text-[var(--color-ink)]/60"
                  )}
                >
                  {m === "scroll" ? "Single scroll" : "Chapters"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          {mode === "scroll" ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing…"
              rows={18}
              className="border-none bg-transparent px-0 text-lg leading-relaxed focus-visible:ring-0 disabled:opacity-60"
            />
          ) : (
            <div className="flex flex-col gap-8">
              {chapters.map((chapter) => (
                <div key={chapter.id}>
                  <Input
                    value={chapter.title}
                    onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                    className="border-none bg-transparent px-0 text-lg font-semibold focus-visible:ring-0"
                  />
                  <Textarea
                    value={chapter.content}
                    onChange={(e) => updateChapter(chapter.id, { content: e.target.value })}
                    placeholder="Start writing this chapter…"
                    rows={10}
                    className="mt-2 border-none bg-transparent px-0 text-lg leading-relaxed focus-visible:ring-0"
                  />
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addChapter} className="self-start">
                Add chapter
              </Button>
            </div>
          )}
        </div>
      </fieldset>

      {isEditable && (
        <div className="mt-8 flex justify-end">
          <Button
            type="button"
            size="lg"
            disabled={!title || wordCount === 0}
            onClick={() => setConfirmOpen(true)}
          >
            {status === "REVISIONS_REQUESTED" ? "Resubmit for review" : "Submit for review"}
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
          >
            <DialogHeader>
              <DialogTitle>Ready for other eyes?</DialogTitle>
              <DialogDescription>
                Submitting doesn&apos;t mean it&apos;s perfect — it means you want feedback
                that&apos;s better than your own. We read everything that comes through,
                properly. We read everything within 5-7 business days.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                Not yet
              </Button>
              <Button onClick={confirmSubmit}>Submit for review</Button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
