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
      className="font-sans text-[17px] leading-[1.75] text-[var(--color-ink)] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:mb-[1.3em] [&_.ProseMirror_strong]:font-bold [&_.ProseMirror_em]:italic [&_.ProseMirror_u]:underline"
    />
  );
}
