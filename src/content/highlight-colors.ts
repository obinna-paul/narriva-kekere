export interface HighlightColor {
  id: string;
  label: string;
  /** Solid color used for the swatch button in the color picker. */
  swatch: string;
  /** Translucent color painted behind highlighted text — works over any of
   * the three reader themes (white/cream/dark) without a separate overlay
   * per theme, since it's mixed with whatever's underneath. */
  overlay: string;
}

/**
 * A small fixed palette rather than a free-form color picker — matches how
 * e-reader highlighting normally works (Kindle, Apple Books) and keeps the
 * floating picker a quick one-tap action instead of a heavier UI.
 */
export const HIGHLIGHT_COLORS: readonly HighlightColor[] = [
  { id: "yellow", label: "Yellow", swatch: "#F2C94C", overlay: "rgba(242, 201, 76, 0.45)" },
  { id: "green", label: "Green", swatch: "#6FCF97", overlay: "rgba(111, 207, 151, 0.4)" },
  { id: "blue", label: "Blue", swatch: "#56B4E9", overlay: "rgba(86, 180, 233, 0.35)" },
  { id: "pink", label: "Pink", swatch: "#E37FA5", overlay: "rgba(227, 127, 165, 0.38)" },
] as const;

export type HighlightColorId = (typeof HIGHLIGHT_COLORS)[number]["id"];

export const HIGHLIGHT_COLOR_IDS = HIGHLIGHT_COLORS.map((c) => c.id) as [HighlightColorId, ...HighlightColorId[]];

export const HIGHLIGHT_COLOR_BY_ID: Readonly<Record<string, HighlightColor>> = Object.fromEntries(
  HIGHLIGHT_COLORS.map((c) => [c.id, c])
);

export function isHighlightColorId(value: string): value is HighlightColorId {
  return value in HIGHLIGHT_COLOR_BY_ID;
}
