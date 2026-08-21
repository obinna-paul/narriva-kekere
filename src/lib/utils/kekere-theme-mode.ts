"use client";

/**
 * Shared light/dark state for the whole Kekere app (nav, bottom nav, every
 * page's KekereTheme instance, and the feed). One reader-facing switch
 * (KekereThemeToggle, living in KekereNav) controls all of it.
 *
 * KekereTheme itself is instantiated per-page (each page.tsx wraps its own
 * content), and the toggle lives in the shared nav — siblings, not
 * parent/child — so there's no shared React state to lift this into without
 * a new provider just for this. localStorage carries the value across
 * reloads, but writing to it does NOT notify other code already open in the
 * same tab (the native `storage` event only fires in *other* tabs) — so a
 * plain write from the nav button would sit in storage until the next full
 * page load before every KekereTheme instance noticed. A custom window
 * event closes that gap: every subscriber reacts instantly, same tab, same
 * page load.
 *
 * The story reader has its own separate white/cream/dark background picker
 * (story-reader.tsx's READER_THEMES) — this module is only ever read there
 * as a *default* for a reader who hasn't made an explicit reader-level
 * choice yet. See story-reader.tsx for how that boundary is kept.
 */

export type KekereThemeMode = "light" | "dark";

export const KEKERE_THEME_MODE_STORAGE_KEY = "kekere-theme-mode";
const KEKERE_THEME_MODE_EVENT = "kekere:theme-mode-change";

export function readThemeMode(): KekereThemeMode {
  try {
    return localStorage.getItem(KEKERE_THEME_MODE_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function writeThemeMode(mode: KekereThemeMode): void {
  try {
    localStorage.setItem(KEKERE_THEME_MODE_STORAGE_KEY, mode);
  } catch {
    // Unavailable storage (private mode, blocked cookies) — the event below
    // still updates every mounted subscriber for the rest of this page view.
  }
  window.dispatchEvent(new CustomEvent<KekereThemeMode>(KEKERE_THEME_MODE_EVENT, { detail: mode }));
}

/** Returns an unsubscribe function — call it from a useEffect cleanup. */
export function onThemeModeChange(callback: (mode: KekereThemeMode) => void): () => void {
  function handler(event: Event) {
    callback((event as CustomEvent<KekereThemeMode>).detail);
  }
  window.addEventListener(KEKERE_THEME_MODE_EVENT, handler);
  return () => window.removeEventListener(KEKERE_THEME_MODE_EVENT, handler);
}
