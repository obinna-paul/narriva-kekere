"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { History, X, ScanEye, Maximize2, Minimize2, FileText, Download } from "lucide-react";
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
import { generateJSON } from "@tiptap/core";
import { cn } from "@/lib/utils/cn";
import { READING_WPM } from "@/content/decisions";
import { StoryEditor, type StoryEditorHandle } from "@/components/kekere/StoryEditor";
import { StoryReaderContent } from "@/components/kekere/StoryReaderContent";
import { AuthorChip } from "@/components/kekere/author-chip";
import { createEditorExtensions } from "@/lib/tiptap/editor-config";
import {
  plainTextToDoc,
  countWords as countWordsInDoc,
  docToPlainText,
  ensureParagraphIds,
  type TiptapDoc,
} from "@/lib/tiptap/doc-utils";
import { formatRelativeTime, type SaveStatus } from "@/lib/tiptap/save-status";

const HOOK_LINE_SOFT = 100;
const HOOK_LINE_HARD = 120;
const TITLE_LIMIT = 200;
const AUTOSAVE_DEBOUNCE_MS = 2000;
const RELATIVE_TIME_TICK_MS = 30000;

const EMPTY_DOC: TiptapDoc = { type: "doc", content: [] };

type Status = "DRAFT" | "SUBMITTED" | "REVIEWING" | "REVISIONS_REQUESTED" | "PENDING_CONTRACT" | "PUBLISHED" | "REJECTED" | "CHANGES_PROPOSED" | "ACCEPTED";

function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

const EDITABLE_STATUSES: Status[] = ["DRAFT", "REVISIONS_REQUESTED"];

const STATUS_STYLES: Record<Status, string> = {
  DRAFT: "bg-[rgba(31,75,75,0.12)] text-[var(--color-accent)]",
  SUBMITTED: "bg-[rgba(31,75,75,0.12)] text-[var(--color-accent)]",
  REVIEWING: "bg-[rgba(31,75,75,0.12)] text-[var(--color-accent)]",
  REVISIONS_REQUESTED: "bg-[var(--color-primary-muted)] text-[var(--color-primary)]",
  PENDING_CONTRACT: "bg-[rgba(31,111,74,0.1)] text-[var(--color-success)]",
  PUBLISHED: "bg-[rgba(31,111,74,0.12)] text-[var(--color-success)]",
  REJECTED: "bg-[rgba(193,58,58,0.12)] text-[#A13A3A]",
  CHANGES_PROPOSED: "bg-[rgba(199,122,30,0.12)] text-[#A8690F]",
  ACCEPTED: "bg-[rgba(31,111,74,0.12)] text-[var(--color-success)]",
};

const STATUS_LABELS: Record<Status, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  REVIEWING: "In review",
  REVISIONS_REQUESTED: "Revisions requested",
  PENDING_CONTRACT: "Contract pending",
  PUBLISHED: "Published",
  REJECTED: "Not accepted",
  CHANGES_PROPOSED: "Edits proposed",
  ACCEPTED: "Accepted for publishing",
};

export function WriterEditor({
  competitionId,
  competitionSlug,
  competitionTitle,
  competitionDeadlineLabel,
  initialStoryId,
  authorName,
  authorAvatarUrl,
  authorAvatarColor,
}: WriterEditorProps) {
  const router = useRouter();

  const [storyId, setStoryId] = useState<string | null>(initialStoryId ?? null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(false);
  const [title, setTitle] = useState("");
  const [hookLine, setHookLine] = useState("");
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
    wordCount?: number;
    label: string;
    savedAt: string;
    content: TiptapDoc;
  } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreToast, setRestoreToast] = useState(false);

  // Feature 1 — distraction-free mode
  const focusModeRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showEscHint, setShowEscHint] = useState(false);

  // Feature 2 — preview mode
  const [previewOpen, setPreviewOpen] = useState(false);

  // Feature 6 — submit preview
  const [submitPreviewOpen, setSubmitPreviewOpen] = useState(false);

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
        // Don't silently mount an empty editor — that lets the autosave
        // overwrite the server content with an empty doc if the user types.
        if (!cancelled) setInitError(true);
      }
    }

    async function createDraft() {
      try {
        const res = await fetch("/api/kekere/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Untitled story", hookLine: " ", body: EMPTY_DOC }),
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
        if (!cancelled) setInitError(true);
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
  }, [storyId, title, hookLine, mode, chapters, isEditable, readingTimeMinutes]);

  useEffect(() => {
    if (hydrating.current || !storyId) return;
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(saveDraft, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(autosaveTimer.current);
  }, [title, hookLine, mode, chapters, storyId, saveDraft]);

  function addChapter() {
    setChapters((prev) => [
      ...prev,
      { id: `ch-${prev.length + 1}`, title: `Chapter ${prev.length + 1}`, content: "" },
    ]);
  }

  function updateChapter(id: string, patch: Partial<Chapter>) {
    setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  // Preview overlays must reflect what's actually in the editor right now,
  // not the doc captured when the page loaded — `initialContent` is never
  // updated as the user types (StoryEditor keeps its own Tiptap state).
  const [previewDoc, setPreviewDoc] = useState<TiptapDoc>(EMPTY_DOC);

  function getLatestDoc(): TiptapDoc {
    if (mode === "chapters") {
      return plainTextToDoc(chapters.map((c) => `${c.title}\n\n${c.content}`).join("\n\n"));
    }
    return editorHandle.current?.getContent() ?? initialContent;
  }

  function openPreview() {
    setPreviewDoc(getLatestDoc());
    setPreviewOpen(true);
  }

  // Feature 6 — confirm submit triggers preview first
  function handleClickSubmit() {
    setPreviewDoc(getLatestDoc());
    setSubmitPreviewOpen(true);
  }

  const [exporting, setExporting] = useState(false);

  // The export endpoint reads the story's saved title/body from the
  // database, not the live editor — flush both before downloading so a
  // draft exported seconds after typing doesn't miss whatever hasn't
  // autosaved yet. saveDraft() covers title/hookline (and body, in chapters
  // mode); the editor handle covers the scroll-mode body separately.
  async function handleExport() {
    if (!storyId || exporting) return;
    setExporting(true);
    try {
      await saveDraft();
      if (mode === "scroll") {
        await editorHandle.current?.flush("Export").catch(() => {});
      }
      window.location.href = `/api/kekere/stories/${storyId}/export`;
    } finally {
      setExporting(false);
    }
  }

  // Upload a Word doc straight into the editor, formatting intact — for
  // writers who already have a draft on their computer instead of starting
  // from a blank page.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);

  function handleUploadClick() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-selected later
    if (!file) return;
    if (wordCount > 0) {
      // Non-empty draft already in progress — confirm before replacing it,
      // since an import overwrites the whole body.
      setPendingImportFile(file);
      setImportConfirmOpen(true);
    } else {
      void performImport(file);
    }
  }

  async function performImport(file: File) {
    if (!storyId) return;
    setImporting(true);
    setImportError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/kekere/stories/${storyId}/import-docx`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportError(data.error ?? "Couldn't import that document.");
        return;
      }
      // generateJSON parses against the exact same extension set the live
      // editor uses, so <strong>/<em>/<u>/<s> land as the matching marks —
      // then ensureParagraphIds assigns paragraph ids the same way normal
      // typing does (generateJSON's one-shot parse doesn't run UniqueID's
      // transaction-based id assignment).
      const rawDoc = generateJSON(data.html, createEditorExtensions()) as TiptapDoc;
      const doc = ensureParagraphIds(rawDoc);
      editorHandle.current?.setContent(doc);
      // setContent doesn't emit an update on its own — flush explicitly so
      // the import is actually persisted, not just visible until reload.
      await editorHandle.current?.flush("Uploaded document").catch(() => {});
    } catch {
      setImportError("Network error while importing your document.");
    } finally {
      setImporting(false);
      setPendingImportFile(null);
      setImportConfirmOpen(false);
    }
  }

  function confirmImport() {
    if (pendingImportFile) void performImport(pendingImportFile);
  }

  function cancelImport() {
    setPendingImportFile(null);
    setImportConfirmOpen(false);
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
        setRestoreToast(true);
        setTimeout(() => window.location.reload(), 1600);
      }
    } finally {
      setRestoring(false);
    }
  }

  // B7.2 — hook line counter (left note + right count, each in context colour)
  const hookLen = hookLine.length;
  const hookCountColor =
    hookLen >= HOOK_LINE_HARD
      ? "text-[#B3371D]"
      : hookLen >= HOOK_LINE_SOFT
        ? "text-[#C77A1E]"
        : "text-[rgba(42,26,18,.45)]";
  const hookNoteColor =
    hookLen >= HOOK_LINE_HARD
      ? "text-[#B3371D]"
      : hookLen >= HOOK_LINE_SOFT
        ? "text-[#C77A1E]"
        : "text-transparent";
  const hookNote =
    hookLen >= HOOK_LINE_HARD
      ? `Over limit — ${hookLen}/${HOOK_LINE_HARD}.`
      : hookLen >= HOOK_LINE_SOFT
        ? "Getting long — hooks work best under 100 characters."
        : "";

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <span className="text-sm text-[var(--color-ink-muted-2)]">Loading editor…</span>
      </div>
    );
  }

  return (
    // overflow-x-clip, not overflow-x-hidden — `hidden` on one axis forces
    // the other axis's computed overflow to `auto` per the CSS spec, which
    // silently turns this div into the containing block the formatting
    // toolbar's `position: sticky` sticks relative to. This div itself
    // never actually scrolls — the real scrolling happens on the document
    // — so sticky positioning computed against it never engages, and the
    // toolbar just scrolls away like ordinary content. `clip` prevents the
    // same horizontal bleed without that side effect.
    <div ref={containerRef} className="kekere-write-page overflow-x-clip">
      <style>{`
        .kekere-focus-mode [data-writer-chrome] { display: none !important; }
        .kekere-focus-mode [data-writer-sidebar] { display: none !important; }
        .kekere-focus-mode [data-writer-header-actions] { display: none !important; }
      `}</style>

      {/* Header chrome — deliberately NOT sticky. Only the formatting
          toolbar below (B/I/U + word count, inside StoryEditor) stays
          pinned while scrolling; this back-link/status/actions block
          scrolls away with the rest of the page like ordinary content. */}
      <div className="border-b border-[var(--color-ink)]/[0.08] bg-[var(--color-bg)]" data-writer-chrome>
        <div className="mx-auto flex max-w-[680px] items-center justify-between px-[22px] py-2.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href="/kekere/write"
              className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--color-primary)]"
              title="Back to your stories"
            >
              ‹ Stories
            </Link>
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
          </div>
        </div>
        <div className="mx-auto flex max-w-[680px] flex-wrap items-center justify-between gap-2 px-[22px] pb-2.5">
          {isEditable && (
            <div className="flex flex-none items-center gap-[7px] whitespace-nowrap rounded-full border border-[rgba(42,26,18,.10)] bg-white px-3 py-[5px]">
              {saveStatus.kind === "saving" ? (
                <span className="h-[11px] w-[11px] flex-none animate-spin rounded-full border-2 border-[rgba(42,26,18,.2)] border-t-[#C75D2C]" />
              ) : (
                <span
                  className={cn(
                    "h-2 w-2 flex-none rounded-full",
                    saveStatus.kind === "dirty" && "animate-pulse"
                  )}
                  style={{ backgroundColor: saveStatusColor(saveStatus.kind) }}
                />
              )}
              <span className="whitespace-nowrap text-[12.5px] font-medium" style={{ color: saveStatusColor(saveStatus.kind) }}>
                {savedLabel.text}
              </span>
              {saveStatus.kind === "conflict" && (
                <button type="button" onClick={openHistory} className="text-[12.5px] font-semibold text-[#B3371D] underline">
                  View conflict
                </button>
              )}
            </div>
          )}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2" data-writer-header-actions>
            {/* Icon cluster stays together as one flex item — if it and
                Submit don't both fit on one line, Submit wraps to its own
                line below instead of being pushed off-screen. Nothing here
                ever needs horizontal scrolling to reach. */}
            {isEditable && (
              <div className="flex flex-wrap items-center gap-2">
                {/* B2.4 — Explicit Save button (Cmd/Ctrl+S does the same) */}
                {mode === "scroll" && storyId && (
                  <button
                    type="button"
                    onClick={() => editorHandle.current?.flush("Manual save")}
                    className="flex items-center gap-1.5 rounded-[9px] border border-[rgba(42,26,18,.14)] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#2A1A12] hover:bg-[rgba(42,26,18,.04)]"
                    title="Save (Cmd+S)"
                  >
                    Save
                  </button>
                )}
                {/* B7.1 — Focus button */}
                <button
                  type="button"
                  onClick={focusModeRef.current ? exitFocusMode : enterFocusMode}
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[rgba(42,26,18,.14)] bg-white text-[#2A1A12] hover:bg-[rgba(42,26,18,.04)]"
                  title={focusModeRef.current ? "Exit focus mode" : "Focus mode (⤢)"}
                >
                  {focusModeRef.current ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
                {/* Preview button */}
                <button
                  type="button"
                  onClick={openPreview}
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[rgba(42,26,18,.14)] bg-white text-[#2A1A12] hover:bg-[rgba(42,26,18,.04)]"
                  title="Preview"
                >
                  <ScanEye size={15} />
                </button>
                {/* Upload button — pull an existing Word doc straight into
                    the editor, formatting intact. Same editable window as
                    Save (DRAFT / REVISIONS_REQUESTED — matches the import
                    route's own server-side gate), scroll mode only since
                    there's no rich-text body to import into in chapters mode. */}
                {(status === "DRAFT" || status === "REVISIONS_REQUESTED") && mode === "scroll" && storyId && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileChosen}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      disabled={importing}
                      className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[rgba(42,26,18,.14)] bg-white text-[#2A1A12] hover:bg-[rgba(42,26,18,.04)] disabled:opacity-50"
                      title="Upload a Word document (.doc or .docx)"
                    >
                      <FileText size={15} />
                    </button>
                  </>
                )}
                {/* Export button — only before a draft has ever been submitted */}
                {status === "DRAFT" && storyId && (
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[rgba(42,26,18,.14)] bg-white text-[#2A1A12] hover:bg-[rgba(42,26,18,.04)] disabled:opacity-50"
                    title="Export as .docx"
                  >
                    <Download size={15} />
                  </button>
                )}
              </div>
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

      <main className="mx-auto max-w-[680px] px-[22px] pb-[80px] pt-[26px]">
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

        {importError && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-lg border-l-4 border-[#A13A3A] bg-[rgba(193,58,58,0.08)] px-4 py-3" data-writer-chrome>
            <p className="text-sm text-[#A13A3A]">{importError}</p>
            <button
              type="button"
              onClick={() => setImportError(null)}
              className="flex-none text-[#A13A3A]/70 hover:text-[#A13A3A]"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {importing && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-[rgba(42,26,18,.14)] bg-white px-4 py-3 text-sm text-[#2A1A12]" data-writer-chrome>
            <span className="h-3.5 w-3.5 flex-none animate-spin rounded-full border-2 border-[rgba(42,26,18,.2)] border-t-[#C75D2C]" />
            Reading your document…
          </div>
        )}

        {status === "REJECTED" && storyId && (
          <a
            href={`/api/kekere/stories/${storyId}/export`}
            className="mb-6 flex items-center justify-center gap-2 rounded-lg border border-[rgba(42,26,18,.14)] bg-white px-4 py-3 text-sm font-semibold text-[#2A1A12] transition-colors hover:bg-[rgba(42,26,18,.04)]"
            data-writer-chrome
          >
            <Download size={15} />
            Export story as .docx
          </a>
        )}

        {justSubmitted && (
          <div className="mb-6 rounded-lg bg-[rgba(31,111,74,0.1)] px-4 py-3 text-sm text-[var(--color-success)]" data-writer-chrome>
            Submitted. We read everything within 5–7 business days.
          </div>
        )}

        {!isEditable && !justSubmitted && (
          <p className="mb-6 text-sm text-[var(--color-ink-muted-3)]" data-writer-chrome>
            This story can&apos;t be edited while it&apos;s {(STATUS_LABELS[status] ?? status).toLowerCase()}.
          </p>
        )}

        <fieldset disabled={!isEditable} className="contents">
          {/* Field 1 — Title */}
          <div className="mb-5 rounded-[14px] border border-[rgba(42,26,18,0.10)] bg-white px-4 py-3.5">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your story a title…"
              disabled={!isEditable}
              maxLength={TITLE_LIMIT}
              aria-label="Story title"
              className="w-full bg-transparent font-[family-name:var(--font-display)] text-[22px] font-semibold leading-[1.25] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted-3)] disabled:opacity-60"
            />
          </div>

          {/* Field 2 — Hookline */}
          <div className="mb-5 rounded-[14px] border border-[rgba(42,26,18,0.10)] bg-white px-4 py-3.5">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">
              Hookline
            </label>
            <textarea
              value={hookLine}
              onChange={(e) => setHookLine(e.target.value.replace(/\n/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
              placeholder="One sharp sentence — what makes someone want to read this?"
              disabled={!isEditable}
              maxLength={HOOK_LINE_HARD}
              rows={2}
              aria-label="Hook line"
              className="w-full resize-none bg-transparent font-[family-name:var(--font-display)] text-[16px] italic leading-[1.5] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted-3)] disabled:opacity-60"
            />
            <div className="mt-2 flex items-center justify-between gap-2.5">
              <span className={cn("text-[12px] font-medium", hookNoteColor)}>{hookNote}</span>
              <span className={cn("flex-none text-[12px] font-semibold", hookCountColor)}>{hookLen}/120</span>
            </div>
          </div>

          {/* Field 3 label */}
          <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">
            Story
          </div>

          {mode === "scroll" ? (
            initError ? (
              <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[rgba(42,26,18,.18)] bg-[rgba(42,26,18,.02)] text-center px-6">
                <p className="text-[14px] text-[rgba(42,26,18,.55)]">
                  Couldn&apos;t load the editor. Your story is safe — this is usually a brief connection hiccup.
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-[9px] bg-[#C75D2C] px-5 py-2 text-[13.5px] font-semibold text-white"
                >
                  Reload and try again
                </button>
              </div>
            ) : storyId ? (
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
            ) : null
          ) : (
            <div className="flex flex-col gap-8">
              {chapters.map((chapter) => (
                <div key={chapter.id}>
                  <input
                    value={chapter.title}
                    onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                    className="w-full bg-transparent font-[family-name:var(--font-display)] text-lg font-semibold outline-none"
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
                <StoryReaderContent doc={previewDoc} />
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
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="mx-auto max-w-[680px]">
              <h1 className="font-[family-name:var(--font-display)] text-[32px] font-semibold leading-[1.2] text-[var(--color-ink)]">
                {title || "Untitled story"}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                {authorName ? (
                  <AuthorChip
                    authorId=""
                    authorName={authorName}
                    avatarColor={authorAvatarColor}
                    avatarUrl={authorAvatarUrl}
                    size="md"
                    linked={false}
                  />
                ) : (
                  <span className="text-[13.5px] text-[var(--color-ink-muted-2)]">by you</span>
                )}
                <span className="text-[13.5px] text-[var(--color-ink-muted-2)]">
                  · {readingTimeMinutes > 0 ? readingTimeMinutes : "< 1"} min read
                </span>
              </div>
              <div className="mt-6">
                <StoryReaderContent doc={previewDoc} />
              </div>
            </div>
          </div>
          <div className="flex flex-none items-center gap-3 border-t border-[var(--color-ink)]/[0.08] bg-[var(--color-bg)] px-6 py-4">
            <button
              type="button"
              onClick={() => setSubmitPreviewOpen(false)}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "rounded-[10px] flex-1 sm:flex-none")}
            >
              Go back and edit
            </button>
            <button
              type="button"
              onClick={confirmSubmit}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }), "rounded-[10px] flex-1 sm:flex-none")}
            >
              Confirm and submit
            </button>
          </div>
        </div>
      )}

      {/* B2.3 — Version restore toast */}
      {restoreToast && (
        <div className="fixed bottom-[22px] left-1/2 z-[60] flex -translate-x-1/2 items-center gap-[9px] whitespace-nowrap rounded-full bg-[#2A1A12] px-[18px] py-[11px] text-[13px] font-medium text-[#F5EBDD] shadow-[0_8px_24px_rgba(42,26,18,.3)]">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#1F4B4B] text-[11px]">✓</span>
          Story version restored
        </div>
      )}

      {/* B7.1 — Esc hint tooltip */}
      {showEscHint && focusModeRef.current && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-[var(--color-ink)]/80 px-4 py-2 text-xs text-white animate-fade-out">
          Press Esc to exit
        </div>
      )}


      {/* Confirm before an uploaded document replaces an already-started draft */}
      <Dialog open={importConfirmOpen} onOpenChange={(open) => { if (!open) cancelImport(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace what you&rsquo;ve written so far?</DialogTitle>
            <DialogDescription>
              Uploading {pendingImportFile?.name} will replace the current body of this draft with the
              document&rsquo;s content. This can&rsquo;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={cancelImport}
              className="rounded-[8px] border border-[rgba(42,26,18,.14)] bg-white px-4 py-2 text-[13px] font-semibold text-[#2A1A12] hover:bg-[rgba(42,26,18,.04)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmImport}
              disabled={importing}
              className="rounded-[8px] bg-[var(--color-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--color-primary-light)] disabled:opacity-50"
            >
              {importing ? "Uploading…" : "Replace with document"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* B2.3 — Version history panel */}
      <Sheet open={historyOpen} onOpenChange={(open) => { setHistoryOpen(open); if (!open) { setSelectedVersion(null); setShowRestoreConfirm(false); } }}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          {/* Header */}
          <div className="flex flex-none items-center justify-between border-b border-[rgba(42,26,18,.10)] px-[18px] py-4">
            <span className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#2A1A12]">
              Version history
            </span>
            <button
              type="button"
              onClick={() => { setHistoryOpen(false); setSelectedVersion(null); setShowRestoreConfirm(false); }}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[rgba(42,26,18,.05)] text-[#2A1A12] hover:bg-[rgba(42,26,18,.10)]"
            >
              <X size={16} />
            </button>
          </div>

          {selectedVersion ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Back + meta */}
              <div className="flex-none border-b border-[rgba(42,26,18,.08)] px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => { setSelectedVersion(null); setShowRestoreConfirm(false); }}
                  className="flex items-center gap-1 text-[13px] font-semibold text-[#C75D2C] hover:underline"
                >
                  ‹ All versions
                </button>
                <p className="mt-2 text-[14px] font-semibold text-[#2A1A12]">{selectedVersion.label}</p>
                <p className="mt-0.5 text-[12px] text-[rgba(42,26,18,.5)]">
                  {selectedVersion.wordCount ? `${selectedVersion.wordCount.toLocaleString()} words · ` : ""}
                  {new Date(selectedVersion.savedAt).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {/* Preview content */}
              <div className="flex-1 overflow-y-auto bg-[#FDF8F0] p-4">
                <StoryReaderContent doc={selectedVersion.content} />
              </div>
              {/* Restore footer */}
              <div className="flex-none border-t border-[rgba(42,26,18,.10)] bg-[#FBF5EC] px-4 py-[14px]">
                {status === "PUBLISHED" ? (
                  <p className="rounded-[9px] bg-[rgba(42,26,18,.04)] px-[13px] py-[11px] text-[12.5px] leading-[1.5] text-[rgba(42,26,18,.6)]">
                    Published stories cannot be edited. Contact us if you need to make changes.
                  </p>
                ) : showRestoreConfirm ? (
                  <div>
                    <p className="mb-2.5 text-[13px] font-medium leading-[1.5] text-[#2A1A12]">
                      Restore this version? A backup of your current content will be saved first.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRestoreConfirm(false)}
                        className="flex-1 rounded-[9px] border border-[rgba(42,26,18,.18)] py-[10px] text-[13px] font-semibold text-[#2A1A12] hover:bg-[rgba(42,26,18,.04)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={restoring}
                        onClick={restoreSelectedVersion}
                        className="flex-1 rounded-[9px] bg-[#C75D2C] py-[10px] text-[13px] font-semibold text-white hover:bg-[#B5512A] disabled:opacity-50"
                      >
                        {restoring ? "Restoring…" : "Confirm restore"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRestoreConfirm(true)}
                    className="w-full rounded-[10px] bg-[#C75D2C] py-3 text-[13.5px] font-semibold text-white hover:bg-[#B5512A]"
                  >
                    Restore this version
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              {versionsLoading && (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-[rgba(42,26,18,.5)]">Loading…</p>
                </div>
              )}
              {!versionsLoading && versions?.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-10 text-center">
                  <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[rgba(42,26,18,.05)] text-[24px] text-[rgba(42,26,18,.4)]">⟲</span>
                  <p className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-[#2A1A12]">No version history yet</p>
                  <p className="text-[13.5px] leading-[1.5] text-[rgba(42,26,18,.55)]">Versions appear here automatically as you write.</p>
                </div>
              )}
              {!versionsLoading && versions && versions.length > 0 && (
                <div className="flex-1 overflow-y-auto px-3 py-2">
                  {versions.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => selectVersion(v.id)}
                      className="mb-2 flex w-full items-center gap-3 rounded-[11px] border border-[rgba(42,26,18,.08)] bg-white px-3 py-[13px] text-left hover:border-[rgba(199,93,44,.35)]"
                    >
                      <span
                        className="h-[9px] w-[9px] flex-none rounded-full"
                        style={{ background: versionDotColor(v.label) }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-[#2A1A12]">{v.label}</span>
                        <span className="mt-0.5 block text-[12px] text-[rgba(42,26,18,.5)]">
                          {v.wordCount.toLocaleString()} words · {formatRelativeTime(v.savedAt)}
                        </span>
                      </span>
                      <span className="flex-none text-[16px] text-[rgba(42,26,18,.3)]">›</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function formatSaveStatus(status: SaveStatus): { text: string } {
  switch (status.kind) {
    case "idle":
      return { text: "All changes saved" };
    case "dirty":
      return { text: "Unsaved changes" };
    case "saving":
      return { text: "Saving…" };
    case "saved":
      return { text: `Saved ${formatRelativeTime(status.lastSavedAt)}` };
    case "offline":
      return { text: "Offline — saved locally" };
    case "conflict":
      return { text: "Conflict — your changes could not be saved." };
  }
}

function saveStatusColor(kind: SaveStatus["kind"]): string {
  switch (kind) {
    case "idle":   return "#5C7A6B";
    case "dirty":  return "#C77A1E";
    case "saving": return "rgba(42,26,18,.55)";
    case "saved":  return "#1F4B4B";
    case "offline": return "#C75D2C";
    case "conflict": return "#B3371D";
  }
}

function versionDotColor(label: string): string {
  if (label.startsWith("Before restore")) return "#9A6A3F";
  if (label.startsWith("Submitted version")) return "#1F4B4B";
  if (label === "Manual save") return "#C75D2C";
  return "rgba(42,26,18,.3)";
}
