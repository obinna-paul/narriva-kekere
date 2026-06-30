"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMirrorThemeVars } from "@/components/theme/use-mirror-theme-vars";

// Admin dashboard palette — neutral internal tool. Brand colours (Narriva blue,
// Kekere orange) appear ONLY as data tags, NEVER as this shell's own chrome.
// See design_handoff_admin_author_kekere/README.md for the full token list.
const ADMIN_THEME_VARS = {
  "--color-primary": "#1A1C20",
  "--color-primary-light": "#2D3139",
  "--color-bg": "#F4F5F7",
  "--color-surface": "#FFFFFF",
  "--color-ink": "#1A1C20",
  "--color-ink-2": "#3A3F47",
  "--color-secondary": "#646B73",
  "--color-muted": "#8B919A",
  "--color-muted-2": "#9AA0A8",
  "--color-border": "rgba(20,22,26,0.08)",
  "--color-border-strong": "rgba(20,22,26,0.14)",
  "--color-row-hover": "#FBFBFC",
  "--color-sidebar": "#15171C",
  "--color-sidebar-text": "#E7E8EA",
  "--color-sidebar-muted": "#7C828C",
  "--color-sidebar-section": "#5E6470",
  "--color-positive": "#1F8A5B",
  "--color-positive-bg": "rgba(31,138,91,0.1)",
  "--color-warning": "#B7791F",
  "--color-warning-bg": "rgba(183,121,31,0.12)",
  "--color-negative": "#C0392B",
  "--color-negative-bg": "rgba(192,57,43,0.1)",
  // Brand data tags — used ONLY on badges/dots that label which platform a row belongs to.
  "--color-narriva-tag": "#1E3A8A",
  "--color-narriva-tag-bg": "rgba(30,58,138,0.10)",
  "--color-kekere-tag": "#C75D2C",
  "--color-kekere-tag-bg": "rgba(199,93,44,0.12)",
  "--color-admin-purple": "#6B21A8",
  "--color-admin-purple-bg": "rgba(107,33,168,0.12)",
  "--font-display": "var(--font-fraunces)",
  "--font-display-weight": "600",
  "--font-body": "var(--font-inter)",
  "--font-mono": "var(--font-ibm-plex-mono)",
  "--radius-button": "8px",
  "--radius-card": "11px",
  "--radius-input": "8px",
  "--radius-pill": "20px",
  "--shadow-card": "none",
} as CSSProperties;

export interface AdminThemeProps {
  children: ReactNode;
}

export function AdminTheme({ children }: AdminThemeProps) {
  useMirrorThemeVars(ADMIN_THEME_VARS);
  return (
    <div className="contents" style={ADMIN_THEME_VARS}>
      {children}
    </div>
  );
}
