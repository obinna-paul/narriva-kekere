export interface AfricanPatternOverlayProps {
  className?: string;
}

/**
 * Low-opacity diamond/textile-grid texture — the visual signature tying
 * Kekere's hero and banner sections back to West African cloth patterns
 * (the same cultural register as "cowries" for currency). Pure CSS, no
 * image asset: two 45deg checkerboards offset by half a tile read as
 * diamonds rather than squares. Absolutely positioned — wrap it in a
 * `relative` parent and give that parent a dark background; this only
 * supplies the texture, not the backdrop colour.
 */
export function AfricanPatternOverlay({ className }: AfricanPatternOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className ?? ""}`}
      style={{
        backgroundImage:
          "linear-gradient(45deg, rgba(224,138,74,0.08) 25%, transparent 25%, transparent 75%, rgba(224,138,74,0.08) 75%), linear-gradient(45deg, rgba(224,138,74,0.08) 25%, transparent 25%, transparent 75%, rgba(224,138,74,0.08) 75%)",
        backgroundSize: "44px 44px",
        backgroundPosition: "0 0, 22px 22px",
      }}
    />
  );
}
