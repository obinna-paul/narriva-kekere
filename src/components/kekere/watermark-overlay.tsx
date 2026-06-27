export interface WatermarkOverlayProps {
  email: string;
  /** Defaults to Kekere's 0.12. Narriva's ebook reader uses a lighter 0.08 —
   * long-form reading makes a heavier watermark more distracting over hundreds
   * of pages than it is over a single short story. */
  opacity?: number;
  /** Defaults to var(--color-ink), the brand-neutral theme token. The ebook
   * reader renders outside NarrivaTheme (it has its own light/sepia/dark
   * themes), so it passes its current theme's ink colour explicitly instead. */
  color?: string;
}

/**
 * Faint, repeating, rotated email watermark over the reading area — a real
 * anti-piracy measure, not deferred to Phase 18 per the spec. Pure CSS, no
 * image generation: a repeating inline-SVG-free grid of text via
 * `repeating-linear-gradient`-free flex wrap, rotated as a whole layer.
 */
export function WatermarkOverlay({ email, opacity = 0.12, color = "var(--color-ink)" }: WatermarkOverlayProps) {
  const rows = Array.from({ length: 14 });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <div
        className="absolute -inset-1/3 flex flex-col gap-10"
        style={{ transform: "rotate(-30deg)", opacity }}
      >
        {rows.map((_, row) => (
          <div key={row} className="flex justify-between whitespace-nowrap">
            {Array.from({ length: 6 }).map((_, col) => (
              <span key={col} className="px-6 text-sm font-medium" style={{ color }}>
                {email}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
