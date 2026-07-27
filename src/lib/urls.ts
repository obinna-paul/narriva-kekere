import { SITE_URL } from "@/content/decisions";

/**
 * Absolute URL for a link we're about to hand to a real person — in an email,
 * an SMS, or an admin's clipboard.
 *
 * These used to be built from `process.env.NEXTAUTH_URL ?? "https://narriva.pro"`,
 * scattered across eight call sites. That variable exists to tell NextAuth
 * where it's running; it is not a promise about where the public site lives.
 * On a platform that sets it per-deployment, or if it's simply set wrong once,
 * every claim link, contract link and password-reset link silently starts
 * pointing at a host the recipient may not be able to reach — and nothing in
 * the app notices, because the links look fine to whoever generated them.
 *
 * In production the answer is never in doubt: it's SITE_URL, the same constant
 * every canonical URL, sitemap entry and OG tag already derives from. Outside
 * production NEXTAUTH_URL is still honoured, so a link generated on localhost
 * keeps pointing at localhost.
 *
 * @param path Root-relative, e.g. "/kekere/claim/abc123".
 */
export function publicUrl(path: string): string {
  const base =
    process.env.NODE_ENV === "production" ? SITE_URL : process.env.NEXTAUTH_URL ?? SITE_URL;
  return `${base.replace(/\/$/, "")}${path}`;
}
