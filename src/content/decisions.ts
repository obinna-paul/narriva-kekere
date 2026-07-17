/**
 * Single source of truth for locked business decisions.
 *
 * Later phases must import from here instead of re-specifying these values.
 * If a number or string below needs to change, change it here — not at the call site.
 */

export const COMPANY_NAME = "Narriva" as const;

export const DOMAINS = {
  narriva: "narriva.pro",
  kekere: "narriva.pro/kekere",
} as const;

// The single shared origin both brands are served from — every canonical
// URL, sitemap entry, OG url, and JSON-LD `url` field should derive from
// this rather than hardcoding "https://narriva.pro" at each call site.
export const SITE_URL = `https://${DOMAINS.narriva}` as const;

export type CowrieTopupPackage = {
  priceNGN: number;
  cowries: number;
  bonusCowries: number;
};

export const COWRIE_TOPUP_PACKAGES: readonly CowrieTopupPackage[] = [
  { priceNGN: 500,  cowries: 10, bonusCowries: 0 },
  { priceNGN: 1000, cowries: 21, bonusCowries: 1 },
  { priceNGN: 1500, cowries: 32, bonusCowries: 2 },
  { priceNGN: 2000, cowries: 45, bonusCowries: 5 },
] as const;

export type StoryTier = "standard" | "featured" | "champion";

export const STORY_TIER_RANGES: Record<StoryTier, readonly [number, number]> = {
  standard: [10, 30],
  featured: [40, 60],
  champion: [70, 100],
} as const;

// Cowrie economy constants — see docs/Narriva_Todays_Decisions_And_Specs.md.
// Mirrors the seeded PlatformSetting rows (writer_earnings_rate,
// tip_amount_cowries, minimum_withdrawal_cowries); keep both in sync if
// either changes. minimum_withdrawal_cowries is editable live from the
// admin settings panel (Economy settings) — this constant is only the
// fallback used if no PlatformSetting row exists for it.
export const WRITER_EARNINGS_RATE = 0.7 as const;
export const TIP_AMOUNT_COWRIES = 1 as const;
export const MINIMUM_WITHDRAWAL_COWRIES = 10 as const;

// Story pricing: admin sets cost at publish time. All stories are paid.
// Range: 1–10 cowries (inclusive). Tier is an editorial classification
// decoupled from price.
export const STORY_COWRIE_RANGE = {
  min: 1,
  max: 10,
} as const;

/** Average reading speed for time estimates. Used across writer UI + reader display. */
export const READING_WPM = 238 as const;
