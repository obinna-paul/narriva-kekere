"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMirrorThemeVars } from "@/components/theme/use-mirror-theme-vars";

// Values match the official design handoff
// (src/Website UI design project/design_handoff_narriva_kekere/README.md) —
// keep these in sync with the `narriva-*` tokens in tailwind.config.ts and
// with that README if either ever changes.
const NARRIVA_THEME_VARS = {
  "--color-primary": "#1E3A8A",
  // Named "-light" for historical reasons (most consumers use it as a hover
  // state: hover:bg-[var(--color-primary-light)]) but the handoff's actual
  // hover value is darker than the base, not lighter.
  "--color-primary-light": "#162C6B",
  "--color-bg": "#FAF8F4",
  "--color-bg-alt": "#F6F3ED",
  "--color-ink": "#161616",
  // Decorative-only gold (dividers, eyebrow rules, large/italic type) — fails
  // AA for body text on --color-bg. Use --color-accent-text for small labels.
  "--color-accent": "#B08D57",
  "--color-accent-text": "#9A7B49",
  "--color-muted": "#55514A",
  "--color-muted-2": "#6B675F",
  "--color-muted-3": "#8A857C",
  "--color-border": "rgba(22,22,22,0.1)",
  // Not in the README's summary table, but used directly in the Library
  // screen's design file for the "Finished" status — same green Kekere uses
  // for its success/positive-amount states.
  "--color-success": "#1F6F4A",
  "--font-display": "var(--font-fraunces)",
  "--font-display-weight": "500",
  "--font-body": "var(--font-inter)",
  "--radius-button": "2px",
  "--radius-card": "6px",
  "--radius-input": "2px",
  "--shadow-card": "0 14px 32px -16px rgba(22,22,22,0.34)",
  "--shadow-card-hover": "0 28px 48px -18px rgba(22,22,22,0.4)",
} as CSSProperties;

export interface NarrivaThemeProps {
  children: ReactNode;
}

/**
 * Sets the brand-neutral theming CSS variables (--color-primary, --font-display,
 * etc.) to Narriva's values. Wrap any src/components/ui primitive in this so it
 * renders with Narriva colours/fonts without the primitive itself knowing it's
 * inside Narriva. Uses `display: contents` so it never introduces a layout box.
 */
export function NarrivaTheme({ children }: NarrivaThemeProps) {
  useMirrorThemeVars(NARRIVA_THEME_VARS);

  return (
    <div className="contents" style={NARRIVA_THEME_VARS}>
      {children}
    </div>
  );
}
