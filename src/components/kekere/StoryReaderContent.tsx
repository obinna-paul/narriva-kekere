"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { createReaderExtensions } from "@/lib/tiptap/editor-config";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";

export interface StoryReaderContentProps {
  doc: TiptapDoc;
}

/**
 * Read-only Tiptap render of a story body. Used for both the unlocked (full
 * doc) and locked (server-truncated doc) cases — StoryReader decides which
 * doc to pass in and overlays its own fade/CTA chrome on top.
 */
export function StoryReaderContent({ doc }: StoryReaderContentProps) {
  const editor = useEditor({
    extensions: createReaderExtensions(),
    content: doc,
    editable: false,
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
      <EditorContent
        editor={editor}
        className="story-reader-prose font-[family-name:var(--font-eb-garamond)] text-[18px] leading-[1.6] tracking-[0.005em] text-[var(--color-ink)] transition-colors duration-300 [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:mb-[0.9em] [&_.ProseMirror_strong]:font-semibold [&_.ProseMirror_em]:italic [&_.ProseMirror_u]:underline [&_.ProseMirror_p[style*='center']]:text-center [&_.ProseMirror_p[style*='right']]:text-right"
      />
  );
}
