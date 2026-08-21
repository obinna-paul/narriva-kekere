"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { readThemeMode, writeThemeMode } from "@/lib/utils/kekere-theme-mode";

/**
 * Lives in KekereNav, beside the notification bell, on every page. Styled to
 * match the bell exactly (same 40×40, rounded-[11px], border/surface chrome
 * that itself follows the active theme) so the two read as a matched pair;
 * only the icon reflects state (moon = tap for dark, sun = tap for light).
 *
 * State lives in lib/utils/kekere-theme-mode.ts, not here — KekereTheme (one
 * instance per page, a sibling of the nav, not its parent) is the other half
 * of this, and needs to hear about a tap immediately without a page reload.
 */
export function KekereThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(readThemeMode() === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    writeThemeMode(next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light background" : "Switch to dark background"}
      aria-pressed={dark}
      className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]/20"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
