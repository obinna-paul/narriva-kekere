"use client";

/**
 * Shared light/dark state for the main feed's background toggle.
 *
 * The toggle button lives in KekereNav (shared chrome across every Kekere
 * page); the styling it controls lives in FeedContent (the feed page's own
 * content). Those are siblings in the DOM tree — page.tsx renders
 * <KekereNavWrapper /> and <FeedContent /> side by side, neither is the
 * other's parent — so there's no shared React state to lift the toggle
 * into without introducing a new provider just for this. localStorage
 * carries the value across reloads, but writing to it does NOT notify other
 * code already open in the same tab (the native `storage` event only fires
 * in *other* tabs) — so a plain write from the nav button would sit in
 * storage until the reader's next full page load before the feed noticed.
 * A custom window event closes that gap: FeedContent reacts to the toggle
 * instantly, same tab, same page load.
 */

export type FeedTheme = "light" | "dark";

export const FEED_THEME_STORAGE_KEY = "kekere-feed-theme";
const FEED_THEME_EVENT = "kekere:feed-theme-change";

export function readFeedTheme(): FeedTheme {
  try {
    return localStorage.getItem(FEED_THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function writeFeedTheme(theme: FeedTheme): void {
  try {
    localStorage.setItem(FEED_THEME_STORAGE_KEY, theme);
  } catch {
    // Unavailable storage (private mode, blocked cookies) — the event below
    // still updates the feed for the rest of this page view.
  }
  window.dispatchEvent(new CustomEvent<FeedTheme>(FEED_THEME_EVENT, { detail: theme }));
}

/** Returns an unsubscribe function — call it from a useEffect cleanup. */
export function onFeedThemeChange(callback: (theme: FeedTheme) => void): () => void {
  function handler(event: Event) {
    callback((event as CustomEvent<FeedTheme>).detail);
  }
  window.addEventListener(FEED_THEME_EVENT, handler);
  return () => window.removeEventListener(FEED_THEME_EVENT, handler);
}
