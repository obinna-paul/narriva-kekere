"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Bold, Italic, Underline as UnderlineIcon } from "lucide-react";
import { createEditorExtensions } from "@/lib/tiptap/editor-config";
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
  /** Story.lastSavedAt from the server, ISO or null — the conflict-detection
   * watermark and the localStorage-recovery comparison point. */
  initialLastSavedAt: string | null;
  onWordCountChange?: (count: number) => void;
  /** Fires on every content change — the parent can display "~X min read". */
  onReadingTimeChange?: (minutes: number) => void;
  /** Fires whenever the save state changes — the writer page renders this
   * as the header status indicator. */
  onStatusChange?: (status: SaveStatus) => void;
  /** Locks the editor (e.g. while the story is under review) — defaults to
   * editable, since most callers are actively-editable drafts. */
  editable?: boolean;
}

const EMPTY_DOC: TiptapDoc = { type: "doc", content: [] };

interface RecoveryState {
  content: TiptapDoc;
  savedAt: string;
}

export interface StoryEditorHandle {
  /** Saves immediately (bypassing the 3s debounce) and snapshots a version
   * — the same thing Cmd/Ctrl+S does. Used by the writer page before
   * submitting, so the just-typed content is never left mid-debounce. */
  flush: (label?: string) => Promise<void>;
}

export const StoryEditor = forwardRef<StoryEditorHandle, StoryEditorProps>(function StoryEditor({
  storyId,
  initialContent,
  initialLastSavedAt,
  onWordCountChange,
  onReadingTimeChange,
  onStatusChange,
  editable = true,
}, ref) {
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [recovery, setRecovery] = useState<RecoveryState | null>(null);

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
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as TiptapDoc;
      const count = editor.storage.characterCount.words();
      const minutes = count === 0 ? 0 : Math.max(1, Math.round(count / READING_WPM));
      onWordCountChange?.(count);
      onReadingTimeChange?.(minutes);
      isDirtyRef.current = true;
      setStatus({ kind: "dirty" });

      // Layer 1 — immediate localStorage backup (fast) + IndexedDB (persistent).
      try {
        const savedAt = new Date().toISOString();
        localStorage.setItem(draftStorageKey(storyId), JSON.stringify(json));
        localStorage.setItem(draftSavedAtStorageKey(storyId), savedAt);
      } catch {
        // Storage full/unavailable — non-fatal.
      }
      void saveDraftIDB(storyId, json, "", "", new Date().toISOString());

      // Layer 2 — debounced server save, 3s after the user stops typing.
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        void saveToServer(json, count);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, SAVE_DEBOUNCE_MS);
    },
  });

  // Layer 6 — recovery check. Check IndexedDB first (more reliable), then
  // localStorage as fallback. Compare timestamps against server lastSavedAt.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;

    async function checkRecovery() {
      // Check IndexedDB first
      const idbDraft = await getDraftIDB(storyId);
      if (idbDraft && !cancelled) {
        const serverTime = initialLastSavedAt ? new Date(initialLastSavedAt).getTime() : 0;
        const idbTime = new Date(idbDraft.timestamp).getTime();
        if (idbTime > serverTime) {
          setRecovery({ content: idbDraft.content as TiptapDoc, savedAt: idbDraft.timestamp });
          return;
        } else {
          void clearDraftIDB(storyId);
        }
      }

      // Fallback to localStorage
      let localRaw: string | null = null;
      let localSavedAt: string | null = null;
      try {
        localRaw = localStorage.getItem(draftStorageKey(storyId));
        localSavedAt = localStorage.getItem(draftSavedAtStorageKey(storyId));
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
  }, [storyId]);

  function clearLocalBackup() {
    try {
      localStorage.removeItem(draftStorageKey(storyId));
      localStorage.removeItem(draftSavedAtStorageKey(storyId));
    } catch {
      // ignore
    }
    void clearDraftIDB(storyId);
  }

  const saveToServer = useCallback(
    async (doc: TiptapDoc, wordCount: number) => {
      if (conflictedRef.current) return;
      setStatus({ kind: "saving" });

      try {
        const res = await fetch(`/api/kekere/stories/${storyId}`, {
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
        // Network failure (offline, DNS, timeout) — the localStorage
        // backup from Layer 1 already has this content, so nothing is
        // lost. Layer 3's retry loop (below) keeps trying.
        setStatus({ kind: "offline" });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [storyId]
  );

  // Retry loop while offline — keeps attempting every 30s, always reading
  // the editor's CURRENT content (not a stale snapshot from when it first
  // failed), since the user may have kept typing while disconnected.
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

  // Layer 3 — manual save: saves immediately, snapshots a version, and
  // clears the local backup. Triggered by Cmd/Ctrl+S, and exposed to the
  // parent (via the imperative handle below) for "save before submit."
  const manualSave = useCallback(
    async (label = "Manual save") => {
      if (!editor) return;
      clearTimeout(debounceTimer.current);
      const doc = editor.getJSON() as TiptapDoc;
      const count = editor.storage.characterCount.words();
      await saveToServer(doc, count);
      if (conflictedRef.current) return;
      try {
        await fetch(`/api/kekere/stories/${storyId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label }),
        });
      } catch {
        // A failed version snapshot shouldn't be reported as a save
        // failure — the content itself already saved successfully above.
      }
      clearLocalBackup();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [editor, saveToServer, storyId]
  );

  useImperativeHandle(ref, () => ({ flush: manualSave }), [manualSave]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isSaveShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s";
      if (!isSaveShortcut) return;
      e.preventDefault();
      void manualSave();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [manualSave]);

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

  return (
    <div className="flex flex-col">
      {recovery && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary-muted)] px-4 py-3 text-sm">
          <span className="text-[var(--color-ink)]">
            We found unsaved local changes from {formatRelativeTime(recovery.savedAt)}.
          </span>
          <div className="flex flex-none gap-4">
            <button
              type="button"
              onClick={handleRestoreLocal}
              className="font-semibold text-[var(--color-primary)] hover:underline"
            >
              Restore local version
            </button>
            <button
              type="button"
              onClick={handleDismissRecovery}
              className="text-[var(--color-ink-muted)] hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center gap-1 border-b border-[var(--color-ink)]/[0.08] pb-2">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>
      </div>

      <EditorContent
        editor={editor}
        className={cn(
          "min-h-[340px] w-full font-sans text-[17px] leading-[1.75] text-[var(--color-ink)]",
          "[&_.ProseMirror]:outline-none",
          "[&_.ProseMirror_p]:mb-[1.3em]",
          "[&_.ProseMirror_strong]:font-bold",
          "[&_.ProseMirror_em]:italic",
          "[&_.ProseMirror_u]:underline",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[var(--color-ink-muted-3)]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
        )}
      />
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
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-[var(--color-primary-muted)] text-[var(--color-primary)]"
          : "text-[var(--color-ink-muted)] hover:bg-[var(--color-ink)]/[0.06]"
      )}
    >
      {children}
    </button>
  );
}
