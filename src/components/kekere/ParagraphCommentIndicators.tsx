"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";

export interface ParagraphCommentIndicatorsProps {
  /** The element StoryReaderContent rendered into — its descendants carry
   * data-paragraph-id (see Phase B1's UniqueID/ParagraphIdAttribute setup). */
  containerRef: React.RefObject<HTMLElement>;
  commentCounts: Record<string, number>;
  selectedParagraphId: string | null;
  /** Clicking the paragraph's text — just selects/highlights it. */
  onSelectParagraph: (paragraphId: string) => void;
  /** Clicking the comment-count badge specifically — the user clearly
   * wants to read comments, so this opens the panel too. */
  onOpenComments: (paragraphId: string) => void;
}

interface BadgePosition {
  paragraphId: string;
  top: number;
  count: number;
}

/**
 * Two responsibilities bundled together because they both need the same
 * DOM measurement pass: (1) click delegation — find which paragraph a
 * click landed in — and (2) positioning the small comment-count badges in
 * the right margin. Highlighting the selected paragraph is done via an
 * injected scoped <style> rule rather than DOM class toggling, so it stays
 * declarative even though the paragraphs themselves are ProseMirror-owned
 * HTML, not React elements.
 */
export function ParagraphCommentIndicators({
  containerRef,
  commentCounts,
  selectedParagraphId,
  onSelectParagraph,
  onOpenComments,
}: ParagraphCommentIndicatorsProps) {
  const [badges, setBadges] = useState<BadgePosition[]>([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function measure() {
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const next: BadgePosition[] = [];
      container.querySelectorAll<HTMLElement>("[data-paragraph-id]").forEach((el) => {
        const id = el.dataset.paragraphId;
        const count = id ? commentCounts[id] : undefined;
        if (!id || !count) return;
        const rect = el.getBoundingClientRect();
        next.push({ paragraphId: id, top: rect.top - containerRect.top, count });
      });
      setBadges(next);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, commentCounts]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-paragraph-id]");
      const id = target?.dataset.paragraphId;
      if (id) onSelectParagraph(id);
    }

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [containerRef, onSelectParagraph]);

  return (
    <>
      {selectedParagraphId && (
        <style>{`
          /* Teal accent — distinct from the burnt-orange used by audio
             playback sync (see StoryAudioPlayer), so a reader can tell at
             a glance which kind of highlight they're looking at. */
          [data-paragraph-id="${selectedParagraphId}"] {
            background-color: rgba(31, 75, 75, 0.08);
            border-left: 3px solid var(--color-accent);
            margin-left: -13px;
            padding-left: 10px;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.15s ease;
          }
        `}</style>
      )}
      <style>{`[data-paragraph-id] { cursor: pointer; }`}</style>

      <div className="pointer-events-none absolute inset-0">
        {badges.map((badge) => (
          <button
            key={badge.paragraphId}
            type="button"
            onClick={() => onOpenComments(badge.paragraphId)}
            className="pointer-events-auto absolute right-[-34px] flex items-center gap-0.5 rounded-full bg-[var(--color-ink)]/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-primary-muted)] hover:text-[var(--color-primary)]"
            style={{ top: badge.top }}
            aria-label={`${badge.count} comment${badge.count === 1 ? "" : "s"} on this paragraph`}
          >
            <MessageCircle size={11} />
            {badge.count}
          </button>
        ))}
      </div>
    </>
  );
}
