import { prisma } from "@/lib/db/prisma";

// Lowercase letters, digits, single hyphens, 3-24 chars, no leading/trailing
// hyphen — readable in a URL and safe to paste anywhere without escaping.
const USERNAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 24;

// Short, curated list — real collision risk (route segments) is already
// zero since /kekere/writer/[id] has no sibling static routes, so this is
// purely about not letting someone impersonate the platform itself.
const RESERVED_USERNAMES = new Set([
  "admin",
  "kekere",
  "narriva",
  "official",
  "support",
  "team",
  "staff",
  "help",
  "moderator",
  "mod",
  "null",
  "undefined",
]);

export function isValidUsernameFormat(username: string): boolean {
  return (
    username.length >= MIN_LENGTH &&
    username.length <= MAX_LENGTH &&
    USERNAME_PATTERN.test(username) &&
    !RESERVED_USERNAMES.has(username)
  );
}

export type SetUsernameResult =
  | { success: true; username: string }
  | { error: "invalid_format" | "taken" };

/**
 * Sets (or clears, with `username: null`) a writer's vanity handle. Format
 * is validated here rather than trusting the client, since this is also the
 * last line of defense before the unique constraint — a friendly "taken"
 * error beats a raw Prisma P2002 reaching the UI.
 */
export async function setKekereUsername(userId: string, username: string | null): Promise<SetUsernameResult> {
  if (username === null) {
    await prisma.user.update({ where: { id: userId }, data: { kekereUsername: null } });
    return { success: true, username: "" };
  }

  const normalized = username.trim().toLowerCase();
  if (!isValidUsernameFormat(normalized)) return { error: "invalid_format" };

  const existing = await prisma.user.findUnique({
    where: { kekereUsername: normalized },
    select: { id: true },
  });
  if (existing && existing.id !== userId) return { error: "taken" };

  await prisma.user.update({ where: { id: userId }, data: { kekereUsername: normalized } });
  return { success: true, username: normalized };
}
