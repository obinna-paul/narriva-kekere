import { prisma } from "@/lib/db/prisma";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const settingCache = new Map<string, CacheEntry<string>>();
const flagCache = new Map<string, CacheEntry<boolean>>();

export function invalidateSettingCache(key: string) {
  settingCache.delete(key);
}

export function invalidateFlagCache(key: string) {
  flagCache.delete(key);
}

export async function getSetting(key: string, fallback: string): Promise<string> {
  const cached = settingCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const setting = await prisma.platformSetting.findUnique({
    where: { key },
    select: { value: true },
  });

  const value = setting?.value ?? fallback;

  settingCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });

  return value;
}

export async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const raw = await getSetting(key, String(fallback));
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? fallback : parsed;
}

export async function getFeatureFlag(key: string, fallback: boolean): Promise<boolean> {
  const cached = flagCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const flag = await prisma.featureFlag.findUnique({
    where: { key },
    select: { enabled: true },
  });

  const value = flag?.enabled ?? fallback;

  flagCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });

  return value;
}
