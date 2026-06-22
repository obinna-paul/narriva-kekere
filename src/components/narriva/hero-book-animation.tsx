import type { CSSProperties } from "react";

/**
 * Looping CSS/SVG animation of a book's interior assembling and its cover
 * layering from flat colour to finished art. ~6s build, ~3s hold, then loops
 * (see the narriva-layer-build / narriva-line-settle keyframes in globals.css).
 *
 * Every element is styled to its FINAL frame by default; the animation is
 * added only via `motion-safe:[animation:...]`, so prefers-reduced-motion
 * users get the static end state automatically — no client JS branching.
 */
const PAGE_LINES = [0, 1, 2, 3, 4];

function layerStyle(finalOpacity: number, delaySeconds: number): CSSProperties {
  return {
    "--narriva-layer-opacity": finalOpacity,
    animationDelay: `${delaySeconds}s`,
  } as CSSProperties;
}

export function HeroBookAnimation() {
  return (
    <svg
      viewBox="0 0 320 380"
      role="img"
      aria-label="Animated illustration of a book's pages and cover assembling"
      className="h-auto w-full max-w-sm"
    >
      {/* Pages stack, left */}
      <rect
        x="16"
        y="24"
        width="150"
        height="332"
        rx="6"
        fill="var(--color-bg)"
        stroke="var(--color-ink)"
        strokeOpacity="0.15"
      />
      {PAGE_LINES.map((i) => (
        <rect
          key={i}
          x="34"
          y={56 + i * 56}
          width={i % 2 === 0 ? 110 : 86}
          height="10"
          rx="2"
          fill="var(--color-ink)"
          fillOpacity={0.55 + i * 0.09}
          className="opacity-100 motion-safe:[animation:narriva-line-settle_9s_ease-out_infinite]"
          style={{ animationDelay: `${i * 0.35}s` }}
        />
      ))}

      {/* Cover, right — layers from a flat block to a finished, decorated cover */}
      <g>
        <rect
          x="166"
          y="24"
          width="138"
          height="332"
          rx="6"
          fill="var(--color-primary)"
          className="opacity-100 motion-safe:[animation:narriva-layer-build_9s_ease-out_infinite]"
          style={layerStyle(1, 1.2)}
        />
        <rect
          x="166"
          y="24"
          width="138"
          height="56"
          rx="6"
          fill="var(--color-accent)"
          className="opacity-[0.85] motion-safe:[animation:narriva-layer-build_9s_ease-out_infinite]"
          style={layerStyle(0.85, 2.4)}
        />
        <circle
          cx="235"
          cy="160"
          r="34"
          fill="var(--color-bg)"
          className="opacity-90 motion-safe:[animation:narriva-layer-build_9s_ease-out_infinite]"
          style={layerStyle(0.9, 3.4)}
        />
        <rect
          x="190"
          y="232"
          width="90"
          height="10"
          rx="2"
          fill="var(--color-bg)"
          className="opacity-100 motion-safe:[animation:narriva-layer-build_9s_ease-out_infinite]"
          style={layerStyle(1, 4.2)}
        />
        <rect
          x="190"
          y="252"
          width="60"
          height="8"
          rx="2"
          fill="var(--color-bg)"
          className="opacity-70 motion-safe:[animation:narriva-layer-build_9s_ease-out_infinite]"
          style={layerStyle(0.7, 4.6)}
        />
      </g>
    </svg>
  );
}
