"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useMirrorThemeVars } from "@/components/theme/use-mirror-theme-vars";
import { readThemeMode, onThemeModeChange } from "@/lib/utils/kekere-theme-mode";

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
  // Aliases for the shared (Narriva-originated) src/components/legal
  // layout, which was built against Narriva's --color-muted*/
  // --color-accent-text token names — Kekere's privacy/terms/refunds/
  // copyright pages reuse that same layout but never had these names
  // defined, so most of that shared component's text was silently
  // falling back to unstyled defaults on every Kekere legal page, in
  // both light and dark mode. Point them at the equivalent ink-muted
  // tones rather than rewriting the shared component.
  "--color-muted": "#6A5446",
  "--color-muted-2": "#8A7565",
  "--color-muted-3": "#A08C7C",
  "--color-accent-text": "#8A7565",
  // Accent-only teal — genre tags, badges, category labels. Never a
  // page-wide background.
  "--color-accent": "#1F4B4B",
  "--color-accent-light": "#2D6B6B",
  "--color-surface": "#FFFFFF",
  "--color-border": "#E8D5C4",
  "--color-cream": "#F7EFE3",
  "--color-success": "#1F6F4A",
  // The app's one recurring "danger" red (error text, destructive actions,
  // sign-out) — not part of the original handoff, but used consistently
  // enough across error states to warrant its own token rather than a
  // hardcoded #A13A3A repeated at dozens of call sites.
  "--color-danger": "#A13A3A",
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

// Dark-mode overrides — only for tokens that describe the *reading surface*
// (page background, body text, cards, borders, and the primary/accent tones
// that sit directly on top of them). Everything left out of this object
// deliberately keeps its light value in dark mode too:
//
// - --color-maroon / --color-maroon-deep / --color-dark-2 are legacy
//   aliases for a permanently-dark decorative tone (hero/CTA sections,
//   "locked" badge text on a gold chip) — those sections are meant to read
//   as intentionally dark regardless of the app's own light/dark setting,
//   the same way a photo doesn't get its colours "corrected" for dark mode.
// - --color-cream, --color-gold(-light), --color-sand-accent(-2) are the
//   same kind of fixed decorative tone (hero headline text sitting on a
//   --color-maroon background, badge chips) — inverting them would put
//   light text on a background that just got lighter too.
//
// The palette below reuses the exact tones the story reader's own "Dark"
// background option already established (story-reader.tsx's READER_THEMES),
// so a reader who likes dark in one place sees the same tone in the other
// instead of two different "darks" in the same app.
const KEKERE_DARK_THEME_VARS = {
  ...KEKERE_THEME_VARS,
  "--color-primary-light": "#E2895A",
  "--color-primary-muted": "rgba(199,93,44,0.2)",
  "--color-bg": "#181510",
  "--color-bg-warm": "#211B14",
  "--color-ink": "#EDE6DA",
  "--color-ink-muted": "#B8AE9E",
  "--color-ink-muted-2": "#9A9082",
  "--color-ink-muted-3": "#7C7366",
  "--color-muted": "#B8AE9E",
  "--color-muted-2": "#9A9082",
  "--color-muted-3": "#7C7366",
  "--color-accent-text": "#9A9082",
  "--color-accent": "#4FA3A3",
  "--color-accent-light": "#6BC2C2",
  "--color-surface": "#211B14",
  "--color-border": "rgba(237,230,218,0.14)",
  "--color-success": "#3FA876",
  // The light value (#A13A3A) computes to roughly 2.8:1 contrast against
  // this dark background — well under the 4.5:1 AA minimum — so this needs
  // its own lighter red rather than staying fixed like the decorative
  // tokens above. #E28080 computes to ~7:1.
  "--color-danger": "#E28080",
  "--shadow-card": "0 10px 24px -12px rgba(0,0,0,0.6)",
  "--shadow-card-hover": "0 16px 32px -14px rgba(0,0,0,0.65)",
} as CSSProperties;

export interface KekereThemeProps {
  children: ReactNode;
}

export function KekereTheme({ children }: KekereThemeProps) {
  // Same defer-then-upgrade pattern used everywhere else this app reads a
  // stored preference: SSR and first paint stay on the light palette so
  // hydration matches exactly, then this upgrades to whatever the reader
  // last picked on this device. onThemeModeChange is what makes a tap on
  // the toggle (in KekereNav, a sibling of this component, not a parent)
  // repaint every page instantly instead of waiting for the next load.
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(readThemeMode() === "dark");
    return onThemeModeChange((mode) => setDark(mode === "dark"));
  }, []);

  const activeVars = dark ? KEKERE_DARK_THEME_VARS : KEKERE_THEME_VARS;

  useMirrorThemeVars(activeVars);

  return (
    <div className="contents" style={activeVars}>
      {children}
    </div>
  );
}
