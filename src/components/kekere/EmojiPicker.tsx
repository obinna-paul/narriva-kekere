"use client";

import { cn } from "@/lib/utils/cn";
import { ALLOWED_REACTION_EMOJIS } from "@/lib/tiptap/reaction-emojis";

export interface EmojiPickerProps {
  userReaction: string | null;
  onSelect: (emoji: string) => void;
  onRemove: () => void;
  className?: string;
}

/** The 12-emoji grid — exactly ALLOWED_REACTION_EMOJIS, no search, no other
 * categories. Clicking the user's current reaction again removes it
 * (toggle), clicking a different one switches it (the API upserts). */
export function EmojiPicker({ userReaction, onSelect, onRemove, className }: EmojiPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {ALLOWED_REACTION_EMOJIS.map((emoji) => {
        const active = userReaction === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => (active ? onRemove() : onSelect(emoji))}
            aria-pressed={active}
            aria-label={active ? `Remove ${emoji} reaction` : `React with ${emoji}`}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-[17px] transition-colors",
              active ? "bg-[var(--color-primary-muted)] ring-2 ring-[var(--color-primary)]" : "hover:bg-[var(--color-ink)]/[0.06]"
            )}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}
