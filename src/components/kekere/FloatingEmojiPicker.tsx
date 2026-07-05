"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EmojiPicker } from "@/components/kekere/EmojiPicker";

const AUTO_DISMISS_MS = 5000; // longer on mobile where hover isn't available

export interface FloatingEmojiPickerProps {
  containerRef: React.RefObject<HTMLElement>;
  paragraphId: string;
  userReaction: string | null;
  onSelect: (emoji: string) => void;
  onRemove: () => void;
  onDismiss: () => void;
}

/** Shown above the just-clicked paragraph when the comment panel is
 * closed — briefly, then gone. Used instead of the panel-embedded picker
 * (CommentPanel renders its own copy) so reacting doesn't require opening
 * the full panel. */
export function FloatingEmojiPicker({
  containerRef,
  paragraphId,
  userReaction,
  onSelect,
  onRemove,
  onDismiss,
}: FloatingEmojiPickerProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const container = containerRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-paragraph-id="${paragraphId}"]`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const PICKER_W = 280; // approximate width of the emoji grid
    const PICKER_H = 48;
    const top = Math.max(8, rect.top - PICKER_H - 8);
    const left = Math.min(rect.left, window.innerWidth - PICKER_W - 8);
    setPosition({ top, left: Math.max(8, left) });
  }, [containerRef, paragraphId]);

  function resetDismissTimer() {
    clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
  }

  useEffect(() => {
    resetDismissTimer();
    return () => clearTimeout(dismissTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!position) return null;

  function handleSelect(emoji: string) {
    onSelect(emoji);
    onDismiss();
  }

  function handleRemove() {
    onRemove();
    onDismiss();
  }

  return createPortal(
    <div
      className="fixed z-[60] hidden rounded-2xl border border-[var(--color-ink)]/10 bg-[var(--color-bg)] p-2 shadow-[0_10px_30px_-10px_rgba(42,26,18,0.35)] md:flex"
      style={{ top: position.top, left: position.left, maxWidth: "calc(100vw - 16px)" }}
      onMouseEnter={() => clearTimeout(dismissTimer.current)}
      onMouseLeave={resetDismissTimer}
      onTouchStart={() => { clearTimeout(dismissTimer.current); resetDismissTimer(); }}
    >
      <EmojiPicker userReaction={userReaction} onSelect={handleSelect} onRemove={handleRemove} />
    </div>,
    document.body
  );
}
