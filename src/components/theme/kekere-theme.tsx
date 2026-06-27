"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMirrorThemeVars } from "@/components/theme/use-mirror-theme-vars";

// Values match the official design handoff
// (src/Website UI design project/design_handoff_narriva_kekere/README.md) —
// keep these in sync with the `kekere-*` tokens in tailwind.config.ts and
// with that README if either ever changes.
const KEKERE_THEME_VARS = {
  // Burnt orange — the loud brand colour. Unlike Narriva's blue, this CAN
  // carry large background fields (hero, CTAs, cards), not just accents.
  "--color-primary": "#C75D2C",
  // Named "-light" for historical reasons (most consumers use it as a hover
  // state) but the handoff's hover value is darker than the base.
  "--color-primary-light": "#B14E22",
  "--color-primary-muted": "#F6DCC8",
  "--color-bg": "#F5EBDD",
  "--color-bg-warm": "#EFE1CE",
  // Deep brown-black — doubles as body text AND the cinematic hero/CTA
  // background colour (--color-maroon below is a legacy alias for the same
  // value, kept so existing components referencing it don't need a rename
  // in this pass).
  "--color-ink": "#2A1A12",
  "--color-ink-muted": "#6A5446",
  "--color-ink-muted-2": "#8A7565",
  "--color-ink-muted-3": "#A08C7C",
  // Accent-only teal — genre tags, badges, category labels. Never a
  // page-wide background.
  "--color-accent": "#1F4B4B",
  "--color-accent-light": "#2D6B6B",
  "--color-surface": "#FFFFFF",
  "--color-border": "#E8D5C4",
  "--color-cream": "#F7EFE3",
  "--color-success": "#1F6F4A",
  "--color-sand-accent": "#E9C9A3",
  "--color-sand-accent-2": "#E08A4A",
  // Legacy aliases from an earlier (pre-handoff) redesign pass — same value
  // as --color-ink now, since the handoff has no separate "deeper" dark
  // tone. Kept so hero/footer components built against these names don't
  // need touching in this tokens-only pass; retire them as each screen gets
  // rebuilt against the handoff directly.
  "--color-maroon": "#2A1A12",
  "--color-maroon-deep": "#2A1A12",
  "--color-dark-2": "#3A2418",
  // Also legacy: the handoff has no "gold" token — Kekere's loud colour is
  // the orange primary. Retargeted to the handoff's warm sand-accent tones
  // so existing gold-badge components stay on-brand pending per-screen
  // cleanup (they should eventually just use --color-primary instead).
  "--color-gold": "#E08A4A",
  "--color-gold-light": "#E9C9A3",
  // Heavier weight than Narriva's Fraunces use — a deliberate distinction
  // (Kekere display type is 600/700, Narriva's is 400/500).
  "--font-display": "var(--font-fraunces)",
  "--font-display-weight": "700",
  "--font-body": "var(--font-inter)",
  "--radius-button": "10px",
  "--radius-card": "16px",
  "--radius-input": "10px",
  "--shadow-card": "0 10px 24px -12px rgba(42,26,18,0.4)",
  "--shadow-card-hover": "0 16px 32px -14px rgba(42,26,18,0.45)",
} as CSSProperties;

export interface KekereThemeProps {
  children: ReactNode;
}

export function KekereTheme({ children }: KekereThemeProps) {
  useMirrorThemeVars(KEKERE_THEME_VARS);

  return (
    <div className="contents" style={KEKERE_THEME_VARS}>
      {children}
    </div>
  );
}
