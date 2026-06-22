"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMirrorThemeVars } from "@/components/theme/use-mirror-theme-vars";

// Hex values mirror the `narriva-*` tokens in tailwind.config.ts. Keep the two
// in sync by hand — Tailwind classes (narriva-bg, narriva-ink, ...) and these
// CSS variables intentionally describe the same palette through two
// different consumption paths (utility classes vs. brand-neutral primitives).
const NARRIVA_THEME_VARS = {
  "--color-primary": "#1E3A8A",
  "--color-primary-light": "#2541B2",
  "--color-bg": "#FAF8F4",
  "--color-ink": "#161616",
  "--color-accent": "#B08D57",
  "--font-display": "var(--font-fraunces)",
  "--font-body": "var(--font-inter)",
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
