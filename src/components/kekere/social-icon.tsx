import { Globe, Music2, AtSign } from "lucide-react";
import type { SocialPlatform } from "@/lib/utils/social-links";

interface SocialIconProps {
  platform: SocialPlatform;
  size?: number;
}

/** Simplified monoline glyphs, not brand logos — stroke-based to match the
 *  rest of the app's lucide iconography rather than pasting in colored
 *  brand marks. Falls back to a generic mark for platforms lucide doesn't
 *  ship an icon for. */
export function SocialIcon({ platform, size = 13 }: SocialIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (platform) {
    case "instagram":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "twitter":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 4l16 16M20 4L4 20" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
          <path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="9.2" />
          <text x="12" y="16.2" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" stroke="none">
            f
          </text>
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="4.5" />
          <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" stroke="none">
            in
          </text>
        </svg>
      );
    case "tiktok":
      return <Music2 width={size} height={size} strokeWidth={2} aria-hidden="true" />;
    case "threads":
      return <AtSign width={size} height={size} strokeWidth={2} aria-hidden="true" />;
    case "website":
    default:
      return <Globe width={size} height={size} strokeWidth={2} aria-hidden="true" />;
  }
}
