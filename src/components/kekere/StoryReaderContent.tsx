"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { createReaderExtensions } from "@/lib/tiptap/editor-config";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";
import { HIGHLIGHT_COLOR_BY_ID } from "@/content/highlight-colors";
import type { HighlightSpan } from "@/lib/tiptap/reader-highlights";

/**
 * Zero-width Unicode formatting characters that carry no glyph: the
 * left-to-right / right-to-left marks, zero-width space/non-joiner/joiner,
 * word joiner, and BOM. Pasting from Word or Google Docs routinely drags
 * these in — an LTR mark at the head of a paragraph is the usual souvenir.
 */
const INVISIBLE_LEADING = /^[​-‏⁠﻿]+/;

/**
 * Removes zero-width formatting characters from the very start of the
 * story's opening paragraph.
 *
 * ::first-letter attaches to the first character, and one of these counts —
 * so a paragraph beginning with an invisible LTR mark hands the drop cap to
 * a glyph that draws nothing, and the story's real first letter renders at
 * body size. Measured in Chromium: 23px against a 29px line, where a
 * working cap is 62px.
 *
 * Deliberately narrow. Only the leading run, only on the first paragraph,
 * and only characters that render as nothing — a writer's real spacing,
 * blank paragraphs included, is left exactly as they wrote it, and the same
 * marks appearing mid-sentence are left alone too.
 */
function stripLeadingInvisibles(doc: TiptapDoc): TiptapDoc {
  const content = doc?.content;
  if (!Array.isArray(content) || content.length === 0) return doc;

  // The paragraph the drop cap will land on: the first one carrying real
  // text. A blank paragraph ahead of it is the writer's own spacing and is
  // left untouched.
  const index = content.findIndex(
    (node) =>
      node?.type === "paragraph" &&
      (node.content ?? []).some((child) => (child.text ?? "").trim().length > 0),
  );
  if (index === -1) return doc;

  const para = content[index];
  const first = para.content?.[0];
  if (!first || first.type !== "text" || !INVISIBLE_LEADING.test(first.text)) return doc;

  const nextContent = [...content];
  nextContent[index] = {
    ...para,
    content: [
      { ...first, text: first.text.replace(INVISIBLE_LEADING, "") },
      ...(para.content ?? []).slice(1),
    ],
  };
  return { ...doc, content: nextContent };
}

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
    content: stripLeadingInvisibles(doc),
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
