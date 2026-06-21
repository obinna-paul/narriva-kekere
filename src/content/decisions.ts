/**
 * Single source of truth for locked business decisions.
 *
 * Later phases must import from here instead of re-specifying these values.
 * If a number or string below needs to change, change it here — not at the call site.
 */

export const COMPANY_NAME = "Narriva" as const;

export const DOMAINS = {
  narriva: "narriva.com",
  kekere: "kekere.narriva.com",
} as const;

export type CowrieTopupPackage = {
  priceNGN: number;
  cowries: number;
  bonusCowries: number;
};

export const COWRIE_TOPUP_PACKAGES: readonly CowrieTopupPackage[] = [
  { priceNGN: 500, cowries: 100, bonusCowries: 0 },
  { priceNGN: 1000, cowries: 210, bonusCowries: 10 },
  { priceNGN: 2500, cowries: 550, bonusCowries: 50 },
  { priceNGN: 5000, cowries: 1150, bonusCowries: 150 },
] as const;

export type StoryTier = "standard" | "featured" | "premium";

export const STORY_TIER_RANGES: Record<StoryTier, readonly [number, number]> = {
  standard: [10, 30],
  featured: [40, 60],
  premium: [70, 100],
} as const;
