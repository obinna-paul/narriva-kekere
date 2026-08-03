export type SocialPlatform =
  | "instagram"
  | "twitter"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "threads"
  | "website";

const PLATFORM_HOSTS: { test: RegExp; platform: SocialPlatform; handleFromPath: boolean }[] = [
  { test: /(^|\.)instagram\.com$/, platform: "instagram", handleFromPath: true },
  { test: /(^|\.)(x|twitter)\.com$/, platform: "twitter", handleFromPath: true },
  { test: /(^|\.)tiktok\.com$/, platform: "tiktok", handleFromPath: true },
  { test: /(^|\.)threads\.net$/, platform: "threads", handleFromPath: true },
  { test: /(^|\.)facebook\.com$/, platform: "facebook", handleFromPath: false },
  { test: /(^|\.)(youtube\.com|youtu\.be)$/, platform: "youtube", handleFromPath: false },
  { test: /(^|\.)linkedin\.com$/, platform: "linkedin", handleFromPath: false },
];

const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  twitter: "X",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  threads: "Threads",
  website: "Website",
};

function safeUrl(href: string): URL | null {
  try {
    return new URL(href);
  } catch {
    try {
      return new URL(`https://${href}`);
    } catch {
      return null;
    }
  }
}

/** Which platform a link points at — drives which icon renders next to it. */
export function detectSocialPlatform(href: string): SocialPlatform {
  const url = safeUrl(href);
  if (!url) return "website";
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  return PLATFORM_HOSTS.find((p) => p.test.test(host))?.platform ?? "website";
}

/**
 * A writer types "Label|https://url" per line when editing (parseSocialLinks
 * in profile-view.tsx) — but pasting a bare link with no "|" leaves label
 * and href identical, which used to render as a raw, wrapping URL full of
 * tracking params (e.g. "?igsh=..."). This derives something a reader would
 * actually want to read instead: a deliberately-set custom label is always
 * respected as-is; a label that's really just the URL gets replaced with
 * "@handle" for platforms where the handle is the first path segment
 * (Instagram/X/TikTok/Threads), the platform name for ones where it isn't
 * (Facebook/YouTube/LinkedIn — their URLs aren't reliably "@handle"-shaped),
 * or the bare hostname as a last resort. Applied at render time, so it
 * retroactively cleans up links saved before this existed too, with no data
 * migration needed.
 */
export function formatSocialLinkLabel(link: { label: string; href: string }): string {
  const trimmedLabel = link.label?.trim() ?? "";
  const looksLikeRawUrl = !trimmedLabel || trimmedLabel === link.href.trim() || /^https?:\/\//i.test(trimmedLabel);
  if (!looksLikeRawUrl) return trimmedLabel;

  const url = safeUrl(link.href);
  if (!url) return trimmedLabel || link.href;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const platformEntry = PLATFORM_HOSTS.find((p) => p.test.test(host));

  if (platformEntry?.handleFromPath) {
    const segment = url.pathname.split("/").filter(Boolean)[0];
    if (segment) {
      try {
        return `@${decodeURIComponent(segment).replace(/^@/, "")}`;
      } catch {
        return `@${segment.replace(/^@/, "")}`;
      }
    }
  }
  if (platformEntry) return PLATFORM_NAMES[platformEntry.platform];

  return host;
}
