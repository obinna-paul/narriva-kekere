"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { HIGHLIGHT_COLORS, type HighlightColorId } from "@/content/highlight-colors";

/**
 * Dismisses the toolbar on any pointerdown outside it — the toolbar's own
 * lifecycle no longer depends on the live browser selection (see the
 * removed collapse-clearing in useTextSelection), specifically so that
 * tapping a color swatch is safe: the browser's native default action of
 * collapsing the text selection on tap would otherwise race
 * useTextSelection's debounced selectionchange handler and unmount this
 * toolbar before onPick ever fires (calling preventDefault() on touchstart
 * to block that collapse was tried and rejected — per spec, that also
 * suppresses the compatibility click event mobile browsers dispatch after
 * touchend, which is what onClick relies on here).
 */
function useDismissOnOutsidePointerDown(ref: React.RefObject<HTMLElement>, onDismiss: () => void) {
  useEffect(() => {
    function handler(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) onDismiss();
    }
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}

const AUTO_DISMISS_MS = 6000;
const TOOLBAR_H = 44;

export interface HighlightToolbarProps {
  /** Anchor rect — either a text selection's bounding box (new highlight)
   * or an existing highlighted span's own rect (tap to recolor/remove). */
  rect: DOMRect;
  /** Set when editing an existing highlight, to ring its current color. */
  activeColorId?: string | null;
  onPick: (colorId: HighlightColorId) => void;
  /** Only present when editing an existing highlight — a brand-new
   * selection has nothing to remove yet. */
  onRemove?: () => void;
  onDismiss: () => void;
}

/** Floating color picker for the reader's private highlight feature —
 * a portal with clamped viewport placement and auto-dismiss, anchored to a
 * text-selection or existing-highlight rect. */
export function HighlightToolbar({ rect, activeColorId, onPick, onRemove, onDismiss }: HighlightToolbarProps) {
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  useDismissOnOutsidePointerDown(containerRef, onDismiss);

  function resetDismissTimer() {
    clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
  }

  useEffect(() => {
    resetDismissTimer();
    return () => clearTimeout(dismissTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rect]);

  const toolbarWidth = HIGHLIGHT_COLORS.length * 32 + (onRemove ? 40 : 0) + 24;
  const top = Math.max(8, rect.top - TOOLBAR_H - 10);
  const left = Math.min(
    Math.max(8, rect.left + rect.width / 2 - toolbarWidth / 2),
    Math.max(8, window.innerWidth - toolbarWidth - 8)
  );

  return createPortal(
    <div
      ref={containerRef}
      className="fixed z-[65] flex items-center gap-1.5 rounded-full border border-[var(--color-ink)]/10 bg-[var(--color-bg)] px-3 py-2 shadow-[0_10px_30px_-10px_rgba(42,26,18,0.35)]"
      style={{ top, left }}
      // Purely cosmetic on desktop now (keeps the native blue selection
      // visible while picking a color) — no longer load-bearing for
      // correctness, since the toolbar's own lifecycle (see
      // useDismissOnOutsidePointerDown above) doesn't depend on the live
      // selection surviving the click.
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={() => clearTimeout(dismissTimer.current)}
      onMouseLeave={resetDismissTimer}
      onTouchStart={() => {
        clearTimeout(dismissTimer.current);
        resetDismissTimer();
      }}
    >
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c.id)}
          aria-label={`Highlight in ${c.label}`}
          className={cn(
            "h-6 w-6 flex-none cursor-pointer rounded-full transition-transform",
            activeColorId === c.id && "scale-110 ring-2 ring-[var(--color-ink)]/40 ring-offset-1"
          )}
          style={{ backgroundColor: c.swatch }}
        />
      ))}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove highlight"
          className="ml-1 flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-full text-[var(--color-ink-muted-2)] transition-colors hover:bg-[rgba(161,58,58,0.1)] hover:text-[#A13A3A]"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>,
    document.body
  );
}
