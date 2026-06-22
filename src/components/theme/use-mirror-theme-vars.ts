"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";

/**
 * Radix portals (Dialog, Select, DropdownMenu) render into document.body by
 * default — outside the `display: contents` wrapper NarrivaTheme/KekereTheme
 * use to set their CSS variables. Without this, portaled content falls back
 * to the neutral :root defaults in globals.css instead of the active brand's
 * palette (e.g. a Kekere modal button rendering grey instead of orange).
 *
 * Mirroring the same variables onto document.body — which IS a shared
 * ancestor of both the normal render tree and any body-appended portal —
 * fixes this without changing Dialog/Select or touching every call site.
 * Only one brand's theme is ever mounted per page, so there's no conflict.
 */
export function useMirrorThemeVars(vars: CSSProperties) {
  useEffect(() => {
    const entries = Object.entries(vars) as [string, string][];
    for (const [key, value] of entries) {
      document.body.style.setProperty(key, value);
    }
    return () => {
      for (const [key] of entries) {
        document.body.style.removeProperty(key);
      }
    };
  }, [vars]);
}
