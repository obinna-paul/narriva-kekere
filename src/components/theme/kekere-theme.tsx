"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMirrorThemeVars } from "@/components/theme/use-mirror-theme-vars";

// Hex values mirror the `kekere-*` tokens in tailwind.config.ts. Keep the two
// in sync by hand — Tailwind classes (kekere-bg, kekere-ink, ...) and these
// CSS variables intentionally describe the same palette through two
// different consumption paths (utility classes vs. brand-neutral primitives).
//
// Kekere shares NO visual identity with Narriva (see README "Brand
// independence rule") — that includes typography. Narriva's whole identity
// is built on a serif display face; Kekere is sans-serif everywhere, no
// exceptions, so the two products never look like siblings even when built
// on the same primitives. Both font variables point at Inter on purpose.
const KEKERE_THEME_VARS = {
  "--color-primary": "#C75D2C",
  "--color-primary-light": "#D2691E",
  "--color-bg": "#F5EBDD",
  "--color-ink": "#2A1A12",
  "--color-accent": "#1F4B4B",
  "--font-display": "var(--font-inter)",
  "--font-body": "var(--font-inter)",
} as CSSProperties;

export interface KekereThemeProps {
  children: ReactNode;
}

/**
 * Sets the brand-neutral theming CSS variables (--color-primary, --font-display,
 * etc.) to Kekere's values. Wrap any src/components/ui primitive in this so it
 * renders with Kekere colours/fonts without the primitive itself knowing it's
 * inside Kekere. Uses `display: contents` so it never introduces a layout box.
 */
export function KekereTheme({ children }: KekereThemeProps) {
  useMirrorThemeVars(KEKERE_THEME_VARS);

  return (
    <div className="contents" style={KEKERE_THEME_VARS}>
      {children}
    </div>
  );
}
