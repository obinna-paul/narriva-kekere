"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { createReaderExtensions } from "@/lib/tiptap/editor-config";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";
import { HIGHLIGHT_COLOR_BY_ID } from "@/content/highlight-colors";
import type { HighlightSpan } from "@/lib/tiptap/reader-highlights";

export interface StoryReaderContentProps {
  doc: TiptapDoc;
  /** A reader's own private highlights on this story — plain
   * HighlightRecord shape (color stored as a HIGHLIGHT_COLOR_IDS id), not
   * yet resolved to a CSS value; resolving happens here so callers don't
   * all need to know about the color palette. Defaults to none, since most
   * StoryReaderContent call sites (e.g. locked-preview rendering) have no
   * use for them. */
  highlights?: {
    id: string;
    paragraphId: string;
    startOffset: number;
    endOffset: number;
    color: string;
    text?: string;
  }[];
}

/**
 * Read-only Tiptap render of a story body. Used for both the unlocked (full
 * doc) and locked (server-truncated doc) cases — StoryReader decides which
 * doc to pass in and overlays its own fade/CTA chrome on top.
 */
export function StoryReaderContent({ doc, highlights = [] }: StoryReaderContentProps) {
  const editor = useEditor({
    extensions: createReaderExtensions(),
    content: doc,
    editable: false,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const spans: HighlightSpan[] = highlights.map((h) => ({
      id: h.id,
      paragraphId: h.paragraphId,
      startOffset: h.startOffset,
      endOffset: h.endOffset,
      color: HIGHLIGHT_COLOR_BY_ID[h.color]?.overlay ?? HIGHLIGHT_COLOR_BY_ID.yellow.overlay,
      text: h.text,
    }));
    editor.commands.setHighlights(spans);
    // highlights is a plain array recreated on every parent render even when
    // its contents haven't changed, so depend on its JSON shape rather than
    // identity to avoid dispatching a no-op transaction on every keystroke
    // elsewhere in the reader (e.g. chrome-visibility state updates).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, JSON.stringify(highlights)]);

  if (!editor) return null;

  return (
      <EditorContent
        editor={editor}
        className="story-reader-prose font-[family-name:var(--font-eb-garamond)] text-[18px] leading-[1.6] tracking-[0.005em] text-[var(--color-ink)] transition-colors duration-300 [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:mb-[0.9em] [&_.ProseMirror_strong]:font-semibold [&_.ProseMirror_em]:italic [&_.ProseMirror_u]:underline [&_.ProseMirror_p[style*='center']]:text-center [&_.ProseMirror_p[style*='right']]:text-right [&_.reader-highlight]:cursor-pointer [&_.reader-highlight]:rounded-[2px] [&_.reader-highlight]:transition-[filter] [&_.reader-highlight]:duration-150 [&_.reader-highlight:hover]:brightness-95"
      />
  );
}
