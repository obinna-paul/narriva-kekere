"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { ParagraphReactionSummary } from "@/components/kekere/use-paragraph-reactions";

export interface EmojiFloatProps {
  containerRef: React.RefObject<HTMLElement>;
  reactionsByParagraph: Record<string, ParagraphReactionSummary>;
}

interface FloatPosition {
  paragraphId: string;
  top: number;
  left: number;
  summary: ParagraphReactionSummary;
}

const RESIZE_DEBOUNCE_MS = 100;
const INITIAL_MEASURE_DELAY_MS = 200;

/**
 * Floats the top-2 emojis for each reacted-to paragraph in the left
 * margin, fixed-positioned and kept in sync with scroll/resize/font-load —
 * per spec, not IntersectionObserver-based (that gives visibility, not Y
 * coordinates) and not CSS-absolute (we want viewport-relative tracking
 * driven by getBoundingClientRect, recomputed on scroll).
 */
export function EmojiFloat({ containerRef, reactionsByParagraph }: EmojiFloatProps) {
  const [positions, setPositions] = useState<FloatPosition[]>([]);
  const rafRef = useRef<number>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function measure() {
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const next: FloatPosition[] = [];

      container.querySelectorAll<HTMLElement>("[data-paragraph-id]").forEach((el) => {
        const id = el.dataset.paragraphId;
        const summary = id ? reactionsByParagraph[id] : undefined;
        if (!id || !summary || summary.top.length === 0) return;

        const rect = el.getBoundingClientRect();
        next.push({
          paragraphId: id,
          top: rect.top,
          left: containerRect.left - 56,
          summary,
        });
      });

      setPositions(next);
    }

    function onScroll() {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        measure();
        rafRef.current = undefined;
      });
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, RESIZE_DEBOUNCE_MS);
    }

    const initialTimer = setTimeout(measure, INITIAL_MEASURE_DELAY_MS);
    document.fonts?.ready?.then(measure).catch(() => {});

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(initialTimer);
      clearTimeout(resizeTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [containerRef, reactionsByParagraph]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 hidden md:block" aria-hidden="true">
      {positions.map(({ paragraphId, top, left, summary }) => (
        <div
          key={paragraphId}
          className="absolute flex -translate-y-1/2 items-center gap-1"
          style={{ top, left }}
        >
          {summary.top.map(({ emoji, count }) => (
            <div
              key={emoji}
              className={cn(
                "flex flex-col items-center justify-center rounded-full bg-[var(--color-bg)] px-1 py-0.5 text-[15px] leading-none shadow-[0_2px_8px_-2px_rgba(42,26,18,0.25)]",
                summary.userReaction === emoji && "ring-2 ring-[var(--color-primary)]"
              )}
            >
              <span>{emoji}</span>
              {count > 1 && (
                <span className="text-[9px] font-semibold leading-none text-[var(--color-ink-muted-2)]">
                  {count}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
