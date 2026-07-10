import type { ReactNode } from "react";

/**
 * Minimal renderer for the lightweight markdown the admin's simple rich text
 * editor writes (see src/components/admin/rich-text-editor.tsx): blank-line
 * paragraphs, "## " headings, **bold**, *italic*, and [text](url) links.
 * Deliberately not a full markdown library — this is the entire supported
 * syntax, by design.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-${i}`}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-${i}`}>{match[2]}</em>);
    } else if (match[3] !== undefined) {
      nodes.push(
        <a
          key={`${keyPrefix}-${i}`}
          href={match[4]}
          className="text-[var(--color-primary)] underline"
        >
          {match[3]}
        </a>
      );
    }
    lastIndex = pattern.lastIndex;
    i += 1;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function renderSimpleMarkdown(content: string): ReactNode[] {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      const key = `block-${i}`;
      if (block.startsWith("## ")) {
        return (
          <h3 key={key} className="mb-[0.6em] mt-[1.6em] font-[family-name:var(--font-display)] text-2xl font-semibold">
            {renderInline(block.slice(3), key)}
          </h3>
        );
      }
      if (block.startsWith("# ")) {
        return (
          <h2 key={key} className="mb-[0.6em] mt-[2em] font-[family-name:var(--font-display)] text-3xl font-semibold">
            {renderInline(block.slice(2), key)}
          </h2>
        );
      }
      if (/^-{3,}$/.test(block)) {
        return (
          <div key={key} className="my-[2em] text-center text-[var(--color-ink)]/30 tracking-[0.3em]" aria-hidden="true">
            * * *
          </div>
        );
      }
      if (block.startsWith("> ")) {
        return (
          <blockquote
            key={key}
            className="my-[1.2em] border-l-2 border-[var(--color-ink)]/15 pl-5 italic text-[var(--color-ink)]/75"
          >
            {renderInline(block.slice(2), key)}
          </blockquote>
        );
      }
      return <p key={key} className="mb-[0.6em] text-justify [hyphens:auto]">{renderInline(block, key)}</p>;
    });
}
