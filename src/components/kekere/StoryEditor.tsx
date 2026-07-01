"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
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
  initialLastSavedAt: string | null;
  onWordCountChange?: (count: number) => void;
  onReadingTimeChange?: (minutes: number) => void;
  onStatusChange?: (status: SaveStatus) => void;
  editable?: boolean;
}

const EMPTY_DOC: TiptapDoc = { type: "doc", content: [] };

interface RecoveryState {
  content: TiptapDoc;
  savedAt: string;
}

export interface StoryEditorHandle {
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
  const [localWordCount, setLocalWordCount] = useState(0);
  const [localReadingTime, setLocalReadingTime] = useState(0);

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
      setLocalWordCount(count);
      setLocalReadingTime(minutes);
      isDirtyRef.current = true;
      setStatus({ kind: "dirty" });

      try {
        const savedAt = new Date().toISOString();
        localStorage.setItem(draftStorageKey(storyId), JSON.stringify(json));
        localStorage.setItem(draftSavedAtStorageKey(storyId), savedAt);
      } catch {
        // Storage full/unavailable — non-fatal.
      }
      void saveDraftIDB(storyId, json, "", "", new Date().toISOString());

      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        void saveToServer(json, count);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, SAVE_DEBOUNCE_MS);
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

  // Recovery check: IndexedDB first, localStorage fallback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;

    async function checkRecovery() {
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
        setStatus({ kind: "offline" });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [storyId]
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
        // Failed version snapshot doesn't negate a successful save.
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

  const readingTimeLabel =
    localWordCount < 200
      ? "< 1 min read"
      : `~${localReadingTime} min read`;

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

      {/* B1 — Formatting toolbar + live word count */}
      <div className="mb-1.5 flex items-center gap-1.5 border-b border-[rgba(42,26,18,.10)] pb-2">
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

        <div className="flex-1" />

        {/* B7.3 — live word count + reading time */}
        <div className="flex items-baseline gap-2.5 text-[12.5px] font-medium text-[rgba(42,26,18,.55)]">
          <span>
            <b className="font-bold text-[#2A1A12]">{localWordCount.toLocaleString()}</b>{" "}
            words
          </span>
          <span className="inline-block h-[11px] w-px bg-[rgba(42,26,18,.2)]" />
          <span>{readingTimeLabel}</span>
        </div>
      </div>

      <EditorContent
        editor={editor}
        className={cn(
          "min-h-[340px] w-full font-sans text-[17px] leading-[1.75] text-[#2A1A12]",
          "[&_.ProseMirror]:caret-[#C75D2C]",
          "[&_.ProseMirror]:outline-none",
          "[&_.ProseMirror_p]:mb-[1.3em]",
          "[&_.ProseMirror_strong]:font-bold",
          "[&_.ProseMirror_em]:italic",
          "[&_.ProseMirror_u]:underline",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[rgba(42,26,18,.38)]",
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
