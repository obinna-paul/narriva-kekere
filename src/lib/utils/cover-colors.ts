/** Derives a light or dark "ink" colour for cover text from the cover's own
 * background — covers are arbitrary editorial colours (not a fixed palette),
 * so watermark/title text drawn directly on a cover must adapt to stay
 * legible on any of them. Shared by every flat-cover treatment (BookCard,
 * LibraryBookCard, the hero book stack). */
export function coverTextColors(hex: string): { ink: string; faint: string } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return luminance > 0.55
    ? { ink: "#2A2419", faint: "rgba(42,36,25,0.55)" }
    : { ink: "#F3EEE3", faint: "rgba(243,238,227,0.62)" };
}
