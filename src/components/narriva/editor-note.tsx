export interface EditorNoteProps {
  text: string;
  editor: string;
}

/** Signed editor's note — "why we published this" — gold left-rule on a
 * warm tint, per the design handoff. */
export function EditorNote({ text, editor }: EditorNoteProps) {
  return (
    <div
      className="rounded-r border-l-[3px] border-[var(--color-accent)] p-[30px] sm:p-[34px]"
      style={{ backgroundColor: "rgba(176,141,87,0.08)" }}
    >
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-text)]">
        Why we published this
      </div>
      <p className="font-[family-name:var(--font-display)] text-[19px] italic leading-[1.6] text-[#3A2E1A]">
        {text}
      </p>
      <p className="mt-[18px] text-sm text-[#7A6748]">— {editor}</p>
    </div>
  );
}
