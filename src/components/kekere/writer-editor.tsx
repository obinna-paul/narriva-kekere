"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, ScanEye, Maximize2, Minimize2, Download, FileText } from "lucide-react";
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
import { STORY_TIER_RANGES, READING_WPM, type StoryTier as LowercaseTier } from "@/content/decisions";
import { StoryEditor, type StoryEditorHandle } from "@/components/kekere/StoryEditor";
import { StoryReaderContent } from "@/components/kekere/StoryReaderContent";
import { plainTextToDoc, countWords as countWordsInDoc, docToPlainText, type TiptapDoc } from "@/lib/tiptap/doc-utils";
import { formatRelativeTime, type SaveStatus } from "@/lib/tiptap/save-status";
import { getPendingDrafts } from "@/lib/offline/draft-store";

const HOOK_LINE_SOFT = 100;
const HOOK_LINE_HARD = 120;
const TITLE_LIMIT = 200;
const AUTOSAVE_DEBOUNCE_MS = 2000;
const RELATIVE_TIME_TICK_MS = 30000;

const EMPTY_DOC: TiptapDoc = { type: "doc", content: [] };

type DbTier = "STANDARD" | "FEATURED" | "PREMIUM";
type Status = "DRAFT" | "SUBMITTED" | "REVIEWING" | "REVISIONS_REQUESTED" | "PUBLISHED" | "REJECTED";
type Mode = "scroll" | "chapters";

interface Chapter {
  id: string;
  title: string;
  content: string;
}

interface VersionSummary {
  id: string;
  versionNumber: number;
  wordCount: number;
  label: string;
  savedAt: string;
}

export interface WriterEditorProps {
  competitionId?: string;
  competitionSlug?: string;
  competitionTitle?: string;
  competitionDeadlineLabel?: string;
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
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [hookLine, setHookLine] = useState("");
  const [tier, setTier] = useState<DbTier>("STANDARD");
  const [mode, setMode] = useState<Mode>("scroll");
  const [initialContent, setInitialContent] = useState<TiptapDoc>(EMPTY_DOC);
  const [serverLastSavedAt, setServerLastSavedAt] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [readingTimeMinutes, setReadingTimeMinutes] = useState(0);
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: "ch-1", title: "Chapter 1", content: "" },
  ]);
  const [status, setStatus] = useState<Status>("DRAFT");
  const [moderationNotes, setModerationNotes] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" });
  const [, forceTick] = useState(0);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<{
    id: string;
    versionNumber: number;
    label: string;
    savedAt: string;
    content: TiptapDoc;
  } | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Feature 1 — distraction-free mode
  const focusModeRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showEscHint, setShowEscHint] = useState(false);

  // Feature 2 — preview mode
  const [previewOpen, setPreviewOpen] = useState(false);

  // Feature 6 — submit preview
  const [submitPreviewOpen, setSubmitPreviewOpen] = useState(false);

  // Feature 5 — drafts badge
  const [hasPendingDrafts, setHasPendingDrafts] = useState(false);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const hydrating = useRef(true);
  const editorHandle = useRef<StoryEditorHandle>(null);

  const isEditable = EDITABLE_STATUSES.includes(status);

  const savedLabel = formatSaveStatus(saveStatus);

  // Re-render every 30s so "Saved 2 min ago" keeps advancing.
  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), RELATIVE_TIME_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  // Feature 1 — Esc key to exit focus mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && focusModeRef.current) {
        exitFocusMode();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Feature 1 — fullscreen change listener
  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement && focusModeRef.current) {
        focusModeRef.current = false;
        containerRef.current?.classList.remove("kekere-focus-mode");
      }
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Feature 5 — check pending drafts on mount
  useEffect(() => {
    getPendingDrafts().then((drafts) => {
      if (drafts.length > 0) setHasPendingDrafts(true);
    }).catch(() => {});
  }, []);

  // Load an existing draft, or create empty one.
  useEffect(() => {
    let cancelled = false;

    async function hydrateExisting(id: string) {
      try {
        const res = await fetch(`/api/kekere/stories/${id}`);
        if (!res.ok) throw res;
        const { story } = await res.json();
        if (cancelled) return;
        setTitle(story.title);
        setHookLine(story.hookLine);
        setTier(story.tier);
        setStatus(story.status);
        setModerationNotes(story.moderationNotes ?? null);
        setServerLastSavedAt(story.lastSavedAt ?? null);
        const wc = story.wordCount ?? 0;
        setWordCount(wc);
        setReadingTimeMinutes(wc === 0 ? 0 : Math.max(1, Math.round(wc / READING_WPM)));
        if (story.isSerialized && Array.isArray(story.chapters)) {
          setMode("chapters");
          setChapters(story.chapters);
        } else {
          setMode("scroll");
          setInitialContent(story.body as TiptapDoc);
        }
      } catch {
        // ignore
      }
    }

    async function createDraft() {
      try {
        const res = await fetch("/api/kekere/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Untitled story", hookLine: " ", body: EMPTY_DOC, tier: "STANDARD" }),
        });
        if (!res.ok) throw res;
        const { story } = await res.json();
        if (cancelled) return;
        setStoryId(story.id);
        setServerLastSavedAt(story.lastSavedAt ?? null);
        const params = new URLSearchParams();
        params.set("id", story.id);
        if (competitionSlug) params.set("competition", competitionSlug);
        router.replace(`/kekere/write?${params.toString()}`, { scroll: false });
      } catch {
        // ignore
      }
    }

    (initialStoryId ? hydrateExisting(initialStoryId) : createDraft()).finally(() => {
      if (cancelled) return;
      hydrating.current = false;
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStoryId]);

  const saveDraft = useCallback(async () => {
    if (!isEditable || !storyId) return;

    const payload: Record<string, unknown> = {
      title: title || "Untitled story",
      hookLine: hookLine || " ",
      tier,
      readingTime: readingTimeMinutes,
      isSerialized: mode === "chapters",
    };
    if (mode === "chapters") {
      payload.body = plainTextToDoc(chapters.map((c) => `${c.title}\n\n${c.content}`).join("\n\n"));
      payload.chapters = chapters;
    }

    try {
      await fetch(`/api/kekere/stories/${storyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Best-effort
    }
  }, [storyId, title, hookLine, tier, mode, chapters, isEditable, readingTimeMinutes]);

  useEffect(() => {
    if (hydrating.current || !storyId) return;
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(saveDraft, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(autosaveTimer.current);
  }, [title, hookLine, tier, mode, chapters, storyId, saveDraft]);

  function addChapter() {
    setChapters((prev) => [
      ...prev,
      { id: `ch-${prev.length + 1}`, title: `Chapter ${prev.length + 1}`, content: "" },
    ]);
  }

  function updateChapter(id: string, patch: Partial<Chapter>) {
    setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  // Feature 6 — confirm submit triggers preview first
  function handleClickSubmit() {
    setSubmitPreviewOpen(true);
  }

  async function confirmSubmit() {
    if (!storyId) return;

    if (mode === "scroll") {
      await editorHandle.current?.flush("Submitted").catch(() => {});
    }
    await saveDraft();

    const res = competitionId
      ? await fetch(`/api/kekere/competitions/${competitionId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId }),
        })
      : await fetch(`/api/kekere/stories/${storyId}/submit`, { method: "POST" });

    if (res.ok) {
      setStatus("SUBMITTED");
      setJustSubmitted(true);
    }
    setConfirmOpen(false);
    setSubmitPreviewOpen(false);
  }

  // Feature 1 — focus mode
  function enterFocusMode() {
    focusModeRef.current = true;
    containerRef.current?.classList.add("kekere-focus-mode");
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    setShowEscHint(true);
    setTimeout(() => setShowEscHint(false), 3000);
  }

  function exitFocusMode() {
    focusModeRef.current = false;
    containerRef.current?.classList.remove("kekere-focus-mode");
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Feature 7 — export TXT
  function exportTxt() {
    if (!storyId) return;
    let body = "";
    try {
      const raw = localStorage.getItem(`kekere_draft_${storyId}`);
      if (raw) {
        const doc = JSON.parse(raw) as TiptapDoc;
        body = docToPlainText(doc);
      }
    } catch {
      // fall through
    }
    if (!body && initialContent) {
      body = docToPlainText(initialContent);
    }
    const text = `${title}\n${hookLine}\n\n${body}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Feature 7 — export PDF
  async function exportPdf() {
    if (!storyId) return;
    try {
      const res = await fetch(`/api/kekere/stories/${storyId}/export/pdf`, { method: "POST" });
      if (res.ok) {
        const { downloadUrl } = await res.json();
        window.location.href = downloadUrl;
      }
    } catch {
      // Silently fail
    }
  }

  async function openHistory() {
    setHistoryOpen(true);
    setSelectedVersion(null);
    if (!storyId || versions) return;
    setVersionsLoading(true);
    try {
      const res = await fetch(`/api/kekere/stories/${storyId}/versions`);
      if (res.ok) {
        const { versions: list } = await res.json();
        setVersions(list);
      }
    } finally {
      setVersionsLoading(false);
    }
  }

  async function selectVersion(versionId: string) {
    if (!storyId) return;
    const res = await fetch(`/api/kekere/stories/${storyId}/versions/${versionId}`);
    if (!res.ok) return;
    const { version } = await res.json();
    setSelectedVersion(version);
  }

  async function restoreSelectedVersion() {
    if (!storyId || !selectedVersion) return;
    setRestoring(true);
    try {
      const res = await fetch(
        `/api/kekere/stories/${storyId}/versions/${selectedVersion.id}/restore`,
        { method: "POST" }
      );
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setRestoring(false);
    }
  }

  // Feature 3 — hook line counter styling
  function hookLineCounterStyle() {
    const len = hookLine.length;
    if (len >= HOOK_LINE_HARD) return { className: "text-[#C13A3A]", label: `Over limit — ${len}/${HOOK_LINE_HARD}` };
    if (len >= HOOK_LINE_SOFT) return { className: "text-[var(--color-primary)]", label: `${len}/${HOOK_LINE_HARD} — Getting long — hooks work best under ${HOOK_LINE_SOFT} characters` };
    return { className: "text-[var(--color-ink-muted-3)]", label: `${len}/${HOOK_LINE_HARD}` };
  }

  const hookCounter = hookLineCounterStyle();

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <span className="text-sm text-[var(--color-ink-muted-2)]">Loading editor…</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="kekere-write-page">
      <style>{`
        .kekere-focus-mode [data-writer-chrome] { display: none !important; }
        .kekere-focus-mode [data-writer-sidebar] { display: none !important; }
        .kekere-focus-mode [data-writer-header-actions] { display: none !important; }
        .kekere-focus-mode [data-writer-footer] { display: none !important; }
      `}</style>

      {/* Header chrome */}
      <div className="sticky top-0 z-20 border-b border-[var(--color-ink)]/[0.08] bg-[var(--color-bg)]/95 backdrop-blur-md" data-writer-chrome>
        <div className="mx-auto flex max-w-[680px] items-center justify-between px-[22px] py-2.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href="/kekere/feed"
              className="min-w-0 flex-1 font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--color-primary)]"
            >
              Kekere
            </Link>
            {status === "PUBLISHED" && (
              <div className="flex items-center gap-1" data-writer-header-actions>
                <button type="button" onClick={exportTxt} title="Export as TXT" className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:bg-[var(--color-ink)]/[0.06] hover:text-[var(--color-primary)]">
                  <FileText size={15} />
                </button>
                <button type="button" onClick={exportPdf} title="Export as PDF" className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:bg-[var(--color-ink)]/[0.06] hover:text-[var(--color-primary)]">
                  <Download size={15} />
                </button>
              </div>
            )}
            {mode === "scroll" && storyId && (
              <button
                type="button"
                onClick={openHistory}
                aria-label="Version history"
                className="flex-none text-[var(--color-ink-muted)] hover:text-[var(--color-primary)]"
              >
                <History size={18} />
              </button>
            )}
            <span
              className={cn(
                "flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold",
                STATUS_STYLES[status]
              )}
            >
              {STATUS_LABELS[status]}
            </span>
            {hasPendingDrafts && storyId && (
              <span className="flex-none rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">
                Unsaved local draft
              </span>
            )}
          </div>
        </div>
        <div className="mx-auto flex max-w-[680px] items-center justify-between px-[22px] pb-2.5">
          <span className="text-xs text-[var(--color-ink-muted-3)]">
            <AnimatePresence mode="wait">
              <motion.span
                key={savedLabel.text}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={savedLabel.tone === "error" ? "text-[#A13A3A]" : undefined}
              >
                {isEditable ? savedLabel.text : ""}
                {isEditable && saveStatus.kind === "conflict" && (
                  <button type="button" onClick={openHistory} className="ml-1 underline">
                    View conflict
                  </button>
                )}
              </motion.span>
            </AnimatePresence>
          </span>
          <div className="flex items-center gap-2" data-writer-header-actions>
            {isEditable && (
              <>
                {/* Feature 1 — Focus button */}
                <button
                  type="button"
                  onClick={focusModeRef.current ? exitFocusMode : enterFocusMode}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:bg-[var(--color-ink)]/[0.06] hover:text-[var(--color-primary)]"
                  title={focusModeRef.current ? "Exit focus mode" : "Focus mode"}
                >
                  {focusModeRef.current ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
                {/* Feature 2 — Preview button */}
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:bg-[var(--color-ink)]/[0.06] hover:text-[var(--color-primary)]"
                  title="Preview"
                >
                  <ScanEye size={15} />
                </button>
              </>
            )}
            {isEditable && (
              <button
                type="button"
                disabled={!title || wordCount === 0}
                onClick={handleClickSubmit}
                className="rounded-[8px] bg-[var(--color-primary)] px-[18px] py-[9px] text-[13.5px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-50"
              >
                {status === "REVISIONS_REQUESTED" ? "Resubmit for review" : "Submit for review"}
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[680px] px-[22px] pb-[120px] pt-[26px]">
        {status === "REVISIONS_REQUESTED" && moderationNotes && (
          <div className="mb-6 rounded-lg border-l-4 border-[var(--color-primary)] bg-[var(--color-primary-muted)] px-4 py-3" data-writer-chrome>
            <p className="text-sm font-semibold text-[var(--color-ink)]">Feedback from the editorial team</p>
            <p className="mt-1 text-sm text-[var(--color-ink)]/80">{moderationNotes}</p>
          </div>
        )}

        {status === "REJECTED" && moderationNotes && (
          <div className="mb-6 rounded-lg border-l-4 border-[#A13A3A] bg-[rgba(193,58,58,0.08)] px-4 py-3" data-writer-chrome>
            <p className="text-sm font-semibold text-[#A13A3A]">Why this wasn&apos;t accepted</p>
            <p className="mt-1 text-sm text-[var(--color-ink)]/80">{moderationNotes}</p>
          </div>
        )}

        {justSubmitted && (
          <div className="mb-6 rounded-lg bg-[rgba(31,111,74,0.1)] px-4 py-3 text-sm text-[var(--color-success)]" data-writer-chrome>
            Submitted. We read everything within 5–7 business days.
          </div>
        )}

        {!isEditable && !justSubmitted && (
          <p className="mb-6 text-sm text-[var(--color-ink-muted-3)]" data-writer-chrome>
            This story can&apos;t be edited while it&apos;s {STATUS_LABELS[status].toLowerCase()}.
          </p>
        )}

        <fieldset disabled={!isEditable} className="contents">
          <div className="mb-5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a catchy title..."
              disabled={!isEditable}
              maxLength={TITLE_LIMIT}
              aria-label="Story title"
              className="w-full bg-transparent font-[family-name:var(--font-display)] text-[26px] font-semibold leading-[1.2] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted-3)] disabled:opacity-60"
            />
          </div>

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
            <div className={cn("mt-2 text-right text-xs", hookCounter.className)}>
              {hookCounter.label}
            </div>
          </div>

          {mode === "scroll" ? (
            storyId && (
              <StoryEditor
                ref={editorHandle}
                storyId={storyId}
                initialContent={initialContent}
                initialLastSavedAt={serverLastSavedAt}
                onWordCountChange={(wc) => {
                  setWordCount(wc);
                }}
                onReadingTimeChange={(mins) => {
                  setReadingTimeMinutes(mins);
                }}
                onStatusChange={setSaveStatus}
                editable={isEditable}
              />
            )
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
                    onChange={(e) => {
                      updateChapter(chapter.id, { content: e.target.value });
                      const allText = chapters.map((c) => (c.id === chapter.id ? e.target.value : c.content)).join(" ");
                      const wc = countWords(allText);
                      setWordCount(wc);
                      setReadingTimeMinutes(wc === 0 ? 0 : Math.max(1, Math.round(wc / READING_WPM)));
                    }}
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

      {/* Feature 2 — Preview overlay */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)]">
          <div className="flex items-center justify-between border-b border-[var(--color-ink)]/[0.08] px-6 py-3">
            <span className="text-sm text-[var(--color-ink-muted)]">
              This is how your story will appear to readers.
            </span>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="rounded-[8px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
            >
              Exit preview
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="mx-auto max-w-[680px]">
              <h1 className="font-[family-name:var(--font-display)] text-[32px] font-semibold leading-[1.2] text-[var(--color-ink)]">
                {title || "Untitled story"}
              </h1>
              <p className="mt-3 font-[family-name:var(--font-display)] text-[19px] italic leading-[1.4] text-[var(--color-ink-muted)]">
                {hookLine || "No hook line"}
              </p>
              <p className="mt-2 text-xs text-[var(--color-ink-muted-3)]">
                ~{readingTimeMinutes > 0 ? readingTimeMinutes : "< 1"} min read
              </p>
              <div className="mt-6">
                <StoryReaderContent doc={initialContent} />
              </div>
              <div className="mt-8 text-center text-[11px] text-[var(--color-ink-muted-3)] opacity-30 select-none">
                you@example.com — Preview
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature 6 — Submit preview overlay */}
      {submitPreviewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)]">
          <div className="flex items-center justify-between border-b border-[var(--color-ink)]/[0.08] px-6 py-3">
            <span className="text-sm text-[var(--color-ink-muted)]">
              This is what you&apos;re submitting. Our team will review it within 5–7 business days.
            </span>
            <button
              type="button"
              onClick={() => setSubmitPreviewOpen(false)}
              className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
            >
              Go back and edit
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="mx-auto max-w-[680px]">
              <h1 className="font-[family-name:var(--font-display)] text-[32px] font-semibold leading-[1.2] text-[var(--color-ink)]">
                {title || "Untitled story"}
              </h1>
              <p className="mt-3 font-[family-name:var(--font-display)] text-[19px] italic leading-[1.4] text-[var(--color-ink-muted)]">
                {hookLine || "No hook line"}
              </p>
              <p className="mt-2 text-xs text-[var(--color-ink-muted-3)]">
                {wordCount.toLocaleString()} words · ~{readingTimeMinutes > 0 ? readingTimeMinutes : "< 1"} min read
              </p>
              <div className="mt-6">
                <StoryReaderContent doc={initialContent} />
              </div>
            </div>
          </div>
          <div className="border-t border-[var(--color-ink)]/[0.08] bg-[var(--color-bg)] px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSubmitPreviewOpen(false)}
              className={cn(buttonVariants({ variant: "secondary" }), "rounded-[10px]")}
            >
              Go back and edit
            </button>
            <button
              type="button"
              onClick={confirmSubmit}
              className={cn(buttonVariants({ variant: "primary" }), "rounded-[10px]")}
            >
              Confirm and submit
            </button>
          </div>
        </div>
      )}

      {/* Feature 1 — Esc hint tooltip */}
      {showEscHint && focusModeRef.current && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-[var(--color-ink)]/80 px-4 py-2 text-xs text-white animate-fade-out">
          Press Esc to exit
        </div>
      )}

      {/* Footer bar */}
      <div className="fixed inset-x-0 bottom-0 z-[15] border-t border-[var(--color-ink)]/[0.08] bg-[var(--color-bg)]/95 py-[13px] text-center backdrop-blur-md" data-writer-footer>
        <span className="text-[13px] text-[var(--color-ink-muted-2)]">
          {wordCount.toLocaleString()} words · ~{readingTimeMinutes > 0 ? readingTimeMinutes : "< 1"} min read
        </span>
      </div>

      {/* Settings sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" data-writer-sidebar>
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

      {/* Version history sidebar */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <span className="font-[family-name:var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">
              Version history
            </span>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              aria-label="Close"
              className="text-[var(--color-ink-muted-2)]"
            >
              <X size={18} />
            </button>
          </div>

          {selectedVersion ? (
            <div className="flex flex-1 flex-col">
              <button
                type="button"
                onClick={() => setSelectedVersion(null)}
                className="mb-4 self-start text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                ← Back to list
              </button>
              <div className="mb-1 text-sm font-semibold text-[var(--color-ink)]">{selectedVersion.label}</div>
              <div className="mb-4 text-xs text-[var(--color-ink-muted-2)]">
                {new Date(selectedVersion.savedAt).toLocaleString()}
              </div>
              <div className="flex-1 overflow-y-auto rounded-lg border border-[var(--color-ink)]/10 p-4 text-sm">
                <StoryReaderContent doc={selectedVersion.content} />
              </div>
              <button
                type="button"
                disabled={restoring}
                onClick={restoreSelectedVersion}
                className="mt-4 rounded-[8px] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-50"
              >
                {restoring ? "Restoring…" : "Restore this version"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {versionsLoading && (
                <p className="text-sm text-[var(--color-ink-muted-2)]">Loading…</p>
              )}
              {!versionsLoading && versions?.length === 0 && (
                <p className="text-sm text-[var(--color-ink-muted-2)]">No saved versions yet.</p>
              )}
              {versions?.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => selectVersion(v.id)}
                  className="flex flex-col gap-0.5 rounded-lg border border-[var(--color-ink)]/10 px-3.5 py-3 text-left transition-colors hover:border-[var(--color-primary)]"
                >
                  <span className="text-sm font-semibold text-[var(--color-ink)]">{v.label}</span>
                  <span className="text-xs text-[var(--color-ink-muted-2)]">
                    {v.wordCount.toLocaleString()} words · {new Date(v.savedAt).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function formatSaveStatus(status: SaveStatus): { text: string; tone?: "error" } {
  switch (status.kind) {
    case "idle":
      return { text: "" };
    case "dirty":
      return { text: "Unsaved changes" };
    case "saving":
      return { text: "Saving…" };
    case "saved":
      return { text: `Saved ${formatRelativeTime(status.lastSavedAt)}` };
    case "offline":
      return { text: "Offline — saved locally", tone: "error" };
    case "conflict":
      return { text: "Conflict — your changes could not be saved.", tone: "error" };
  }
}
