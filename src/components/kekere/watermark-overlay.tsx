export interface WatermarkOverlayProps {
  email: string;
}

/**
 * Faint, repeating, rotated email watermark over the reading area — a real
 * anti-piracy measure, not deferred to Phase 18 per the spec. Pure CSS, no
 * image generation: a repeating inline-SVG-free grid of text via
 * `repeating-linear-gradient`-free flex wrap, rotated as a whole layer.
 */
export function WatermarkOverlay({ email }: WatermarkOverlayProps) {
  const rows = Array.from({ length: 14 });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <div
        className="absolute -inset-1/3 flex flex-col gap-10 opacity-[0.12]"
        style={{ transform: "rotate(-30deg)" }}
      >
        {rows.map((_, row) => (
          <div key={row} className="flex justify-between whitespace-nowrap">
            {Array.from({ length: 6 }).map((_, col) => (
              <span
                key={col}
                className="px-6 text-sm font-medium text-[var(--color-ink)]"
              >
                {email}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
