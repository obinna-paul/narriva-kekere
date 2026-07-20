"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Search, ChevronUp, ChevronDown, X } from "lucide-react";
import { createEditorExtensions } from "@/lib/tiptap/editor-config";
import { searchAndReplacePluginKey } from "@/lib/tiptap/search-and-replace";
import { cn } from "@/lib/utils/cn";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";
import {
  draftStorageKey,
  draftSavedAtStorageKey,
  formatRelativeTime,
  type SaveStatus,
} from "@/lib/tiptap/save-status";
import { READING_WPM } from "@/content/decisions";
import { saveDraft as saveDraftIDB, getDraft as getDraftIDB, clearDraft as clearDraftIDB } from "@/lib/offline/draft-store";

const SAVE_DEBOUNCE_MS = 3000;
const RETRY_INTERVAL_MS = 30000;

export interface StoryEditorProps {
  storyId: string;
  initialContent: TiptapDoc | null;
  initialLastSavedAt: string | null;
  onWordCountChange?: (count: number) => void;
  onReadingTimeChange?: (minutes: number) => void;
  onStatusChange?: (status: SaveStatus) => void;
  editable?: boolean;
  /**
   * When false, the editor never talks to the server: no debounced
   * autosave, no local draft recovery, no version snapshots. It just edits
   * and exposes getContent()/flush() for the parent to read on demand. Used
   * by the admin author-on-behalf screen, where the story doesn't exist at
   * `/api/kekere/stories/[storyId]` yet (and `storyId` there is actually a
   * writer id) — leaving autosave on made it fire 403/404 PUTs while typing
   * and pop a spurious "unsaved changes" banner. Defaults to true so the
   * normal writer flow is completely unchanged.
   */
  autosave?: boolean;
  /**
   * Where debounced body saves and manual (Ctrl+S) saves are PUT. Defaults to
   * the writer's own story route. The admin review-queue editor points this at
   * its editorial-working-copy route instead, which writes the edited* columns
   * rather than the live body. The endpoint must accept the same
   * { body, wordCount, expectedLastSavedAt } payload and return
   * { story: { lastSavedAt } }.
   */
  saveEndpoint?: string;
  /**
   * Where a manual-save version snapshot is POSTed. Null disables snapshotting
   * entirely — used by the admin review editor, whose working copy isn't part
   * of the writer's own version history. Defaults to the writer versions route.
   */
  versionsEndpoint?: string | null;
  /**
   * Namespaces the localStorage/IndexedDB recovery keys. Defaults to storyId.
   * The admin review editor overrides it so an admin's in-progress edits to a
   * story never collide with that same browser's recovery of the writer's own
   * draft of the same storyId.
   */
  storageKey?: string;
}

const EMPTY_DOC: TiptapDoc = { type: "doc", content: [] };

interface RecoveryState {
  content: TiptapDoc;
  savedAt: string;
}

export interface StoryEditorHandle {
  flush: (label?: string) => Promise<void>;
  getContent: () => TiptapDoc | null;
  setContent: (doc: TiptapDoc) => void;
}

export const StoryEditor = forwardRef<StoryEditorHandle, StoryEditorProps>(function StoryEditor({
  storyId,
  initialContent,
  initialLastSavedAt,
  onWordCountChange,
  onReadingTimeChange,
  onStatusChange,
  editable = true,
  autosave = true,
  saveEndpoint,
  versionsEndpoint,
  storageKey,
}, ref) {
  // Default the configurable endpoints/keys to the writer flow so nothing in
  // the normal path changes. versionsEndpoint is intentionally allowed to be
  // an explicit null (snapshots off), so only substitute the default when it's
  // undefined.
  const saveUrl = saveEndpoint ?? `/api/kekere/stories/${storyId}`;
  const versionsUrl = versionsEndpoint === undefined ? `/api/kekere/stories/${storyId}/versions` : versionsEndpoint;
  const persistKey = storageKey ?? storyId;
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [recovery, setRecovery] = useState<RecoveryState | null>(null);
  const [localWordCount, setLocalWordCount] = useState(0);
  const [localReadingTime, setLocalReadingTime] = useState(0);

  // Secondary toolbar row (alignment + find) — collapsed by default so the
  // main row (B/I/U, word count, reading time) always fits on one line
  // without needing horizontal scrolling to reach anything in it.
  const [toolbarExpanded, setToolbarExpanded] = useState(false);

  // Select all / cut — surfaced as a small floating toolbar that appears
  // next to the user's own text selection (see selectionToolbarPos below),
  // the same way the OS's native selection menu does, rather than as
  // permanent buttons docked in the formatting toolbar.
  const [cutError, setCutError] = useState<string | null>(null);
  const [, forceSelectionToolbarRecompute] = useState(0);

  // Find & replace
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [searchTerm, setSearchTermState] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [searchCount, setSearchCount] = useState(0);
  const [searchIndex, setSearchIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const toolbarWrapperRef = useRef<HTMLDivElement>(null);

  const isDirtyRef = useRef(false);
  const conflictedRef = useRef(false);
  const lastKnownLastSavedAtRef = useRef<string | null>(initialLastSavedAt);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: initialContent ?? EMPTY_DOC,
    editable,
    immediatelyRender: false,
    // Tiptap 3 doesn't force a re-render on every transaction by default —
    // only content-changing ones happen to trigger one here as a side
    // effect of onUpdate's own setState calls below. A selection-only
    // change (e.g. Select All, or just clicking to move the caret) doesn't
    // touch the document, so nothing re-rendered and every editor.isActive()/
    // editor.state.selection read in this component's JSX (bold/italic/
    // underline/alignment "active" pills, the Cut button's disabled state)
    // went stale until some unrelated re-render happened to catch it up.
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor, transaction }) => {
      const json = editor.getJSON() as TiptapDoc;
      const count = editor.storage.characterCount.words();
      const minutes = count === 0 ? 0 : Math.max(1, Math.round(count / READING_WPM));
      onWordCountChange?.(count);
      onReadingTimeChange?.(minutes);
      setLocalWordCount(count);
      setLocalReadingTime(minutes);

      // The UniqueID extension (editor-config.ts) assigns a paragraph id the
      // moment the editor mounts, via two different internal code paths —
      // one tags its transaction "__uniqueIDTransaction", the other (its
      // onCreate initial-id-check) only sets "addToHistory: false" — so both
      // meta flags need checking, not just one. Either fires onUpdate before
      // the writer has typed anything; treating that as a real edit made
      // every brand-new story immediately show a false "unsaved changes"
      // recovery banner, since it wrote a fresher-than-server
      // localStorage/IndexedDB entry with content identical to what the
      // server already has.
      if (
        transaction.getMeta("__uniqueIDTransaction") ||
        transaction.getMeta("addToHistory") === false
      ) {
        return;
      }

      isDirtyRef.current = true;
      setStatus({ kind: "dirty" });

      // Compose-only mode (admin author-on-behalf) never persists anywhere —
      // the parent reads getContent() on submit instead.
      if (!autosave) return;

      try {
        const savedAt = new Date().toISOString();
        localStorage.setItem(draftStorageKey(persistKey), JSON.stringify(json));
        localStorage.setItem(draftSavedAtStorageKey(persistKey), savedAt);
      } catch {
        // Storage full/unavailable — non-fatal.
      }
      void saveDraftIDB(persistKey, json, "", "", new Date().toISOString());

      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        void saveToServer(json, count);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, SAVE_DEBOUNCE_MS);
    },
    onTransaction: ({ editor }) => {
      const pluginState = searchAndReplacePluginKey.getState(editor.state);
      if (!pluginState) return;
      setSearchCount(pluginState.results.length);
      setSearchIndex(pluginState.currentIndex);
    },
  });

  // Initialise word count from existing content without waiting for a keypress.
  useEffect(() => {
    if (!editor) return;
    const count = editor.storage.characterCount.words();
    const minutes = count === 0 ? 0 : Math.max(1, Math.round(count / READING_WPM));
    setLocalWordCount(count);
    setLocalReadingTime(minutes);
  }, [editor]);

  // The floating selection toolbar's position (below) is computed from
  // viewport coordinates on every selection-changing transaction, but
  // scrolling the page doesn't fire a transaction — without this it would
  // stay pinned to its old spot on screen while the text scrolls underneath.
  useEffect(() => {
    if (!editor) return;
    const onScroll = () => {
      if (!editor.state.selection.empty) forceSelectionToolbarRecompute((n) => n + 1);
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [editor]);

  // Recovery check: IndexedDB first, localStorage fallback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!autosave) return;
    let cancelled = false;

    async function checkRecovery() {
      const idbDraft = await getDraftIDB(persistKey);
      if (idbDraft && !cancelled) {
        const serverTime = initialLastSavedAt ? new Date(initialLastSavedAt).getTime() : 0;
        const idbTime = new Date(idbDraft.timestamp).getTime();
        if (idbTime > serverTime) {
          setRecovery({ content: idbDraft.content as TiptapDoc, savedAt: idbDraft.timestamp });
          return;
        } else {
          void clearDraftIDB(persistKey);
        }
      }

      let localRaw: string | null = null;
      let localSavedAt: string | null = null;
      try {
        localRaw = localStorage.getItem(draftStorageKey(persistKey));
        localSavedAt = localStorage.getItem(draftSavedAtStorageKey(persistKey));
      } catch {
        return;
      }
      if (!localRaw || !localSavedAt) return;

      const serverTime = initialLastSavedAt ? new Date(initialLastSavedAt).getTime() : 0;
      const localTime = new Date(localSavedAt).getTime();

      if (localTime > serverTime) {
        try {
          setRecovery({ content: JSON.parse(localRaw) as TiptapDoc, savedAt: localSavedAt });
        } catch {
          clearLocalBackup();
        }
      } else {
        clearLocalBackup();
      }
    }

    void checkRecovery();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  function clearLocalBackup() {
    try {
      localStorage.removeItem(draftStorageKey(persistKey));
      localStorage.removeItem(draftSavedAtStorageKey(persistKey));
    } catch {
      // ignore
    }
    void clearDraftIDB(persistKey);
  }

  const saveToServer = useCallback(
    async (doc: TiptapDoc, wordCount: number) => {
      if (conflictedRef.current) return;
      setStatus({ kind: "saving" });

      try {
        const res = await fetch(saveUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: doc,
            wordCount,
            expectedLastSavedAt: lastKnownLastSavedAtRef.current,
          }),
        });

        if (res.status === 409) {
          conflictedRef.current = true;
          setStatus({ kind: "conflict" });
          return;
        }
        if (!res.ok) throw new Error(`save failed with status ${res.status}`);

        const { story } = await res.json();
        lastKnownLastSavedAtRef.current = story.lastSavedAt;
        isDirtyRef.current = false;
        clearLocalBackup();
        setStatus({ kind: "saved", lastSavedAt: story.lastSavedAt });
      } catch {
        setStatus({ kind: "offline" });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [saveUrl]
  );

  useEffect(() => {
    if (status.kind !== "offline" || !editor) return;
    const interval = setInterval(() => {
      if (!isDirtyRef.current) return;
      const doc = editor.getJSON() as TiptapDoc;
      const count = editor.storage.characterCount.words();
      void saveToServer(doc, count);
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status.kind, editor, saveToServer]);

  const manualSave = useCallback(
    async (label = "Manual save") => {
      if (!editor) return;
      // Compose-only mode: nothing to flush to the server.
      if (!autosave) return;
      clearTimeout(debounceTimer.current);
      const doc = editor.getJSON() as TiptapDoc;
      const count = editor.storage.characterCount.words();
      await saveToServer(doc, count);
      if (conflictedRef.current) return;
      if (versionsUrl) {
        try {
          await fetch(versionsUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label }),
          });
        } catch {
          // Failed version snapshot doesn't negate a successful save.
        }
      }
      clearLocalBackup();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [editor, saveToServer, versionsUrl, autosave]
  );

  const getContent = useCallback(() => {
    return editor ? (editor.getJSON() as TiptapDoc) : null;
  }, [editor]);

  const setContent = useCallback(
    (doc: TiptapDoc) => {
      editor?.commands.setContent(doc);
    },
    [editor]
  );

  useImperativeHandle(ref, () => ({ flush: manualSave, getContent, setContent }), [manualSave, getContent, setContent]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isSaveShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s";
      if (isSaveShortcut) {
        e.preventDefault();
        void manualSave();
        return;
      }

      const isFindShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f";
      if (isFindShortcut) {
        e.preventDefault();
        openFindReplace();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualSave]);

  function openFindReplace() {
    setFindReplaceOpen(true);
    // Let the panel actually mount before trying to focus it.
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function closeFindReplace() {
    setFindReplaceOpen(false);
    setSearchTermState("");
    editor?.commands.setSearchTerm("");
    editor?.commands.focus();
  }

  // ProseMirror's own tr.scrollIntoView() doesn't know about the sticky
  // toolbar sitting on top of the editor, so it can leave the current match
  // scrolled to right underneath it. The decoration's DOM class carries a
  // scroll-margin-top (see EditorContent's className below), and the native
  // scrollIntoView respects that — so once the decoration has actually
  // re-rendered (next frame), reach for it directly instead.
  function scrollCurrentMatchIntoView() {
    requestAnimationFrame(() => {
      document.querySelector(".kekere-search-match-current")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function handleSearchChange(term: string) {
    setSearchTermState(term);
    editor?.commands.setSearchTerm(term);
    if (term) scrollCurrentMatchIntoView();
  }

  function findNext() {
    editor?.commands.goToSearchResult(searchIndex + 1);
    scrollCurrentMatchIntoView();
  }

  function findPrevious() {
    editor?.commands.goToSearchResult(searchIndex - 1);
    scrollCurrentMatchIntoView();
  }

  function handleReplace() {
    if (searchIndex < 0) return;
    // Focus moves into the editor at the replaced spot afterward — not just
    // cosmetic: Ctrl+Z only reaches ProseMirror's own undo history when the
    // editor itself has DOM focus, and leaving focus stuck on this button
    // would silently break "undo my last replace" right after clicking it.
    editor?.chain().replaceSearchResult(searchIndex, replaceTerm).focus().run();
    scrollCurrentMatchIntoView();
  }

  function handleReplaceAll() {
    if (searchCount === 0) return;
    editor?.chain().replaceAllSearchResults(replaceTerm).focus().run();
  }

  function handleSelectAll() {
    editor?.chain().focus().selectAll().run();
  }

  async function handleCut() {
    if (!editor || editor.state.selection.empty) return;
    setCutError(null);

    // document.execCommand("cut") works directly off the live DOM selection
    // (which ProseMirror keeps in sync with its own), and is far more
    // broadly supported across mobile browsers/webviews than the async
    // Clipboard API — it's the same mechanism a native Ctrl+X already uses
    // here. Only fall back to Clipboard API if the browser refuses it.
    const cutHandled = document.execCommand("cut");
    if (cutHandled) return;

    try {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, "\n\n");
      await navigator.clipboard.writeText(text);
      editor.chain().focus().deleteSelection().run();
    } catch {
      setCutError("Couldn't cut — your browser blocked clipboard access. Try copying manually instead.");
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) findPrevious();
      else findNext();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeFindReplace();
    }
  }

  function handleRestoreLocal() {
    if (!editor || !recovery) return;
    editor.commands.setContent(recovery.content);
    setRecovery(null);
  }

  function handleDismissRecovery() {
    clearLocalBackup();
    setRecovery(null);
  }

  if (!editor) return null;

  const readingTimeLabel =
    localWordCount < 200
      ? "< 1 min read"
      : `~${localReadingTime} min read`;

  // Select all / Cut only show up attached to an actual selection — same
  // spirit as the OS's own selection menu — rather than as permanent
  // toolbar buttons. Position is derived straight from the selection's
  // on-screen coordinates, which are already fresh here because ProseMirror
  // updates its DOM outside of React before this component re-renders.
  let selectionToolbarPos: { top: number; left: number } | null = null;
  if (editor.isFocused && !editor.state.selection.empty) {
    try {
      const { from, to } = editor.state.selection;
      const startCoords = editor.view.coordsAtPos(from);
      const endCoords = editor.view.coordsAtPos(to);
      const top = Math.min(startCoords.top, endCoords.top);
      const bottom = Math.max(startCoords.bottom, endCoords.bottom);
      const left = (Math.min(startCoords.left, endCoords.left) + Math.max(startCoords.right, endCoords.right)) / 2;
      const TOOLBAR_HEIGHT = 40;
      const GAP = 10;
      // Measure the actual sticky formatting toolbar's bottom edge rather
      // than guessing a fixed clearance — if placing the floating toolbar
      // above the selection would land it on top of (or under) that sticky
      // chrome, place it below the selection instead.
      const stickyBottom = toolbarWrapperRef.current?.getBoundingClientRect().bottom ?? 0;
      const placeBelow = top - TOOLBAR_HEIGHT - GAP < stickyBottom + GAP;
      const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 400;
      selectionToolbarPos = {
        top: placeBelow ? bottom + GAP : top - TOOLBAR_HEIGHT - GAP,
        left: Math.min(Math.max(left, 90), viewportWidth - 90),
      };
    } catch {
      selectionToolbarPos = null;
    }
  }

  return (
    <div className="flex flex-col">
      {/* B2.2 — Local draft recovery banner */}
      {recovery && (
        <div className="mb-5">
          <div className="flex items-start gap-3 rounded-[12px] border border-[#E8C98C] bg-[#FBEFD9] p-[13px_14px]">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#C75D2C] text-[15px] text-white">
              ↻
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-[#2A1A12]">
                We found unsaved changes from {formatRelativeTime(recovery.savedAt)}.
              </p>
              <p className="mt-0.5 text-[12.5px] text-[rgba(42,26,18,.6)]">
                Restore them, or keep the version saved on our server.
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={handleRestoreLocal}
                  className="rounded-[8px] bg-[#C75D2C] px-[14px] py-[7px] text-[12.5px] font-semibold text-white"
                >
                  Restore local version
                </button>
                <button
                  type="button"
                  onClick={handleDismissRecovery}
                  className="rounded-[8px] border border-[rgba(42,26,18,.18)] bg-transparent px-[14px] py-[7px] text-[12.5px] font-semibold text-[#2A1A12]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cutError && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-[12px] border border-red-200 bg-red-50 p-[13px_14px] text-[13px] text-red-700">
          <p>{cutError}</p>
          <button
            type="button"
            onClick={() => setCutError(null)}
            className="flex-none text-red-700/70 hover:text-red-700"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* B1 — Formatting toolbar + live word count. This is the only part of
          the writer page that stays pinned while scrolling (the header above
          — back link, save status, Submit — scrolls away normally); --writer-
          header-h lets embedding admin screens offset it below their own
          separate top bar, and defaults to 0px (stick to the very top) in
          the normal writer flow. Kept deliberately short — B/I/U, word
          count, reading time, and a toggle — so it always fits on one line
          with nothing needing a horizontal slide to reach. Less-used
          controls (alignment, find & replace) live in the row the toggle
          reveals below instead of being crammed in here. */}
      <div
        ref={toolbarWrapperRef}
        className="sticky top-[var(--writer-header-h,0px)] z-[16] -mx-[22px] mb-1.5 flex flex-col border-b border-[rgba(42,26,18,.10)] bg-[var(--color-bg)]"
      >
        <div className="flex items-center gap-1.5 px-[22px] py-2">
          <ToolbarButton
            label="Bold (Ctrl+B)"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <span className="font-[family-name:var(--font-display)] text-[17px] font-bold leading-none">B</span>
          </ToolbarButton>
          <ToolbarButton
            label="Italic (Ctrl+I)"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <span className="font-[family-name:var(--font-display)] text-[17px] font-semibold italic leading-none">I</span>
          </ToolbarButton>
          <ToolbarButton
            label="Underline (Ctrl+U)"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span className="text-[17px] font-semibold leading-none underline underline-offset-[3px]">U</span>
          </ToolbarButton>

          {/* B7.3 — live word count + reading time. min-w-0 + truncate lets
              this shrink (with an ellipsis) rather than pushing the toggle
              button below off the edge of the screen — a real bug on a
              360px-wide phone with a long story ("1,728 words · ~7 min
              read" is right at the edge of that budget once B/I/U and the
              toggle have taken their fixed share). */}
          <div
            className="min-w-0 flex-1 truncate text-right text-[12.5px] font-medium text-[rgba(42,26,18,.55)]"
            title={`${localWordCount.toLocaleString()} words · ${readingTimeLabel}`}
          >
            <b className="font-bold text-[#2A1A12]">{localWordCount.toLocaleString()}</b> words{" "}
            <span className="text-[rgba(42,26,18,.35)]">·</span> {readingTimeLabel}
          </div>

          <ToolbarButton
            label={toolbarExpanded ? "Fewer formatting options" : "More formatting options"}
            active={toolbarExpanded}
            onClick={() => setToolbarExpanded((v) => !v)}
          >
            {toolbarExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </ToolbarButton>
        </div>

        {toolbarExpanded && (
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-[rgba(42,26,18,.08)] px-[22px] py-2">
            <ToolbarButton
              label="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft size={16} />
            </ToolbarButton>
            <ToolbarButton
              label="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              <AlignCenter size={16} />
            </ToolbarButton>
            <ToolbarButton
              label="Align right"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight size={16} />
            </ToolbarButton>
            <ToolbarButton
              label="Justify"
              active={editor.isActive({ textAlign: "justify" })}
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            >
              <AlignJustify size={16} />
            </ToolbarButton>

            <span className="mx-0.5 inline-block h-[22px] w-px flex-none bg-[rgba(42,26,18,.14)]" />

            <ToolbarButton
              label="Find & replace (Ctrl+F)"
              active={findReplaceOpen}
              onClick={() => (findReplaceOpen ? closeFindReplace() : openFindReplace())}
            >
              <Search size={16} />
            </ToolbarButton>
          </div>
        )}
      </div>

      {/* Find & replace panel — two fixed rows (find, then replace) rather
          than one row of flex-wrap items. A single wrapping row let the two
          text inputs (both flex-1) shrink to fit instead of wrapping, which
          on a narrow phone squeezed them down to a couple of visible
          characters — explicit rows sidestep that entirely, and each row
          still wraps internally as a safety net if it's ever too narrow to
          read even on its own. */}
      {findReplaceOpen && (
        <div className="-mx-[22px] mb-3 flex flex-col gap-2 border-b border-[rgba(42,26,18,.10)] bg-[rgba(199,93,44,0.04)] px-[22px] py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[160px] flex-1 items-center gap-1.5 rounded-[9px] border border-[rgba(42,26,18,.14)] bg-white px-2.5 py-1.5">
              <Search size={14} className="flex-none text-[rgba(42,26,18,.45)]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Find in story…"
                className="w-full min-w-0 bg-transparent text-[13.5px] text-[#2A1A12] outline-none placeholder:text-[rgba(42,26,18,.4)]"
              />
              {searchTerm && (
                <span
                  data-testid="search-match-counter"
                  className="flex-none whitespace-nowrap text-[12px] text-[rgba(42,26,18,.5)]"
                >
                  {searchCount > 0 ? `${searchIndex + 1}/${searchCount}` : "0/0"}
                </span>
              )}
            </div>

            <div className="flex flex-none items-center gap-1">
              <button
                type="button"
                onClick={findPrevious}
                disabled={searchCount === 0}
                aria-label="Previous match"
                title="Previous match (Shift+Enter)"
                className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[rgba(42,26,18,.14)] bg-white text-[#2A1A12] hover:bg-[rgba(42,26,18,.04)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronUp size={15} />
              </button>
              <button
                type="button"
                onClick={findNext}
                disabled={searchCount === 0}
                aria-label="Next match"
                title="Next match (Enter)"
                className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[rgba(42,26,18,.14)] bg-white text-[#2A1A12] hover:bg-[rgba(42,26,18,.04)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronDown size={15} />
              </button>
              <button
                type="button"
                onClick={closeFindReplace}
                aria-label="Close find & replace"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] text-[rgba(42,26,18,.5)] hover:bg-[rgba(42,26,18,.06)] hover:text-[#2A1A12]"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeFindReplace();
              }}
              placeholder="Replace with…"
              className="min-w-[160px] flex-1 rounded-[9px] border border-[rgba(42,26,18,.14)] bg-white px-2.5 py-[7px] text-[13.5px] text-[#2A1A12] outline-none placeholder:text-[rgba(42,26,18,.4)]"
            />
            <div className="flex flex-none items-center gap-1.5">
              <button
                type="button"
                onClick={handleReplace}
                disabled={searchCount === 0}
                className="rounded-[8px] border border-[rgba(42,26,18,.14)] bg-white px-2.5 py-[7px] text-[12.5px] font-semibold text-[#2A1A12] hover:bg-[rgba(42,26,18,.04)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleReplaceAll}
                disabled={searchCount === 0}
                className="rounded-[8px] bg-[#C75D2C] px-2.5 py-[7px] text-[12.5px] font-semibold text-white hover:bg-[#B0531E] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Replace all
              </button>
            </div>
          </div>
        </div>
      )}

      <EditorContent
        editor={editor}
        className={cn(
          "min-h-[340px] w-full font-sans text-[17px] leading-[1.75] text-[#2A1A12]",
          "[&_.ProseMirror]:min-h-[340px]",
          "[&_.ProseMirror]:caret-[#C75D2C]",
          "[&_.ProseMirror]:outline-none",
          "[&_.ProseMirror_p]:mb-[1.3em]",
          "[&_.ProseMirror_strong]:font-bold",
          "[&_.ProseMirror_em]:italic",
          "[&_.ProseMirror_u]:underline",
          "[&_.ProseMirror_p[style*='center']]:text-center",
          "[&_.ProseMirror_p[style*='right']]:text-right",
          "[&_.kekere-search-match]:rounded-[2px] [&_.kekere-search-match]:bg-[rgba(233,201,163,.55)]",
          "[&_.kekere-search-match-current]:bg-[#E9C963] [&_.kekere-search-match-current]:scroll-mt-[140px]",
          // TextAlign only writes an inline style when a paragraph's
          // alignment differs from defaultAlignment ("justify", set in
          // editor-config.ts) — so a paragraph at the default has no style
          // attribute at all and needs this fallback to actually render
          // justified. Excludes anything with an explicit left/center/right
          // style so those choices still visibly win.
          "[&_.ProseMirror_p:not([style*='left']):not([style*='center']):not([style*='right'])]:text-justify"
        )}
      />

      {selectionToolbarPos && (
        <div
          className="fixed z-[60] flex -translate-x-1/2 items-center gap-0.5 rounded-[10px] bg-[#2A1A12] p-1 text-white shadow-[0_4px_14px_rgba(0,0,0,.28)]"
          style={{ top: selectionToolbarPos.top, left: selectionToolbarPos.left }}
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectAll();
            }}
            className="whitespace-nowrap rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-white/10"
          >
            Select all
          </button>
          <span className="h-4 w-px flex-none bg-white/20" />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              void handleCut();
            }}
            className="whitespace-nowrap rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-white/10"
          >
            Cut
          </button>
        </div>
      )}
    </div>
  );
});

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => {
        // Prevent blur so the selection/caret is preserved when clicking toolbar.
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] transition-colors",
        active
          ? "border border-[#2A1A12] bg-[#2A1A12] text-[#F5EBDD]"
          : "border border-[rgba(42,26,18,.14)] bg-white text-[#2A1A12] hover:bg-[rgba(42,26,18,.04)]"
      )}
    >
      {children}
    </button>
  );
}
