import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

// Generic slot-based card. Brand-specific cards (BookCard, StoryCard, etc.)
// compose this in Phase 3 / Phase 10 — do not add brand fields here. Radius
// and shadow come from --radius-card/--shadow-card (set per brand by
// NarrivaTheme/KekereTheme) per the design handoff — Narriva's cards are a
// tight 6px with a deep, soft shadow; Kekere's are a soft 16px with a
// warmer, tighter one.
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-ink)]/10 bg-[var(--color-bg)] text-[var(--color-ink)] shadow-[var(--shadow-card)]",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("border-b border-[var(--color-ink)]/10 p-5 sm:p-6", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 sm:p-6", className)} {...props} />
  )
);
CardBody.displayName = "CardBody";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-3 border-t border-[var(--color-ink)]/10 p-5 sm:p-6",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";
