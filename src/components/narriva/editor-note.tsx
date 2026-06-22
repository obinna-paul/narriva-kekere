import { Quote } from "lucide-react";
import { Heading, Body } from "@/components/ui/typography";

export interface EditorNoteProps {
  text: string;
  editor: string;
}

/** Signed editor's note — "why we published this" — visually set apart with a tinted block. */
export function EditorNote({ text, editor }: EditorNoteProps) {
  return (
    <div className="rounded-lg border-l-4 border-[var(--color-accent)] bg-[var(--color-accent)]/10 p-6 sm:p-8">
      <div className="flex items-center gap-2 text-[var(--color-accent)]">
        <Quote className="h-5 w-5" aria-hidden="true" />
        <Heading as="h3" size="h4" font="body">
          Why we published this
        </Heading>
      </div>
      <Body size="lg" font="display" className="mt-4 italic">
        {text}
      </Body>
      <p className="mt-4 text-sm text-[var(--color-ink)]/60">— {editor}</p>
    </div>
  );
}
