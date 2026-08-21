"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { readFeedTheme, writeFeedTheme } from "@/lib/utils/feed-theme";

/**
 * Lives in KekereNav, beside the notification bell — only rendered on the
 * feed page itself (see the pathname check at the call site), since the
 * dark background it controls is feed-only. Styled to match the bell
 * exactly (same 40×40, rounded-[11px], white/border chrome) so the two read
 * as a matched pair; only the icon reflects state (moon = tap for dark, sun
 * = tap for light), since the nav bar itself stays light regardless of what
 * the feed below it is doing.
 *
 * State lives in lib/utils/feed-theme.ts, not here — FeedContent (a sibling
 * component, not a parent) is the other half of this, and needs to hear
 * about a tap immediately without a page reload.
 */
export function FeedThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(readFeedTheme() === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    writeFeedTheme(next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch feed to light background" : "Switch feed to dark background"}
      aria-pressed={dark}
      className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] border border-[rgba(42,26,18,.12)] bg-white text-[#2A1A12] transition-colors hover:border-[rgba(42,26,18,.2)]"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
