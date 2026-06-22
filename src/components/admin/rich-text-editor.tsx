"use client";

import { useRef } from "react";
import { Bold, Italic, Heading2, Link as LinkIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

type WrapKind = "bold" | "italic" | "heading" | "link";

/**
 * "Simple rich text editor" per the spec: a plain textarea plus a toolbar
 * that wraps the current selection in the lightweight markdown syntax
 * src/lib/utils/markdown.tsx knows how to render — bold, italic, headings,
 * links. Not a WYSIWYG editor; that's a deliberate scope choice.
 */
export function RichTextEditor({ value, onChange, id }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(kind: WrapKind) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const selected = value.slice(selectionStart, selectionEnd) || "text";
    let inserted: string;

    switch (kind) {
      case "bold":
        inserted = `**${selected}**`;
        break;
      case "italic":
        inserted = `*${selected}*`;
        break;
      case "heading":
        inserted = `## ${selected}`;
        break;
      case "link":
        inserted = `[${selected}](https://)`;
        break;
    }

    const next = value.slice(0, selectionStart) + inserted + value.slice(selectionEnd);
    onChange(next);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionStart + inserted.length);
    });
  }

  const toolbarButtons: { kind: WrapKind; label: string; icon: typeof Bold }[] = [
    { kind: "bold", label: "Bold", icon: Bold },
    { kind: "italic", label: "Italic", icon: Italic },
    { kind: "heading", label: "Heading", icon: Heading2 },
    { kind: "link", label: "Link", icon: LinkIcon },
  ];

  return (
    <div>
      <div className="flex gap-1 rounded-t-md border border-b-0 border-[var(--color-ink)]/20 bg-[var(--color-ink)]/[0.03] p-1.5">
        {toolbarButtons.map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            aria-label={label}
            onClick={() => wrapSelection(kind)}
            className="rounded p-1.5 text-[var(--color-ink)]/70 hover:bg-[var(--color-ink)]/10 hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}
      </div>
      <Textarea
        id={id}
        ref={textareaRef}
        rows={14}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-t-none"
      />
    </div>
  );
}
