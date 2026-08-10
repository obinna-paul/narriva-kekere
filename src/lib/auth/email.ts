/**
 * Reduces an email to a single canonical identity, so obvious aliases of one
 * real inbox collapse to the same value. Used only to dedupe the signup
 * bonus (one free grant per real inbox) — never for login, lookup, or
 * sending, which always use the address exactly as the user typed it
 * (lowercased).
 *
 * Two transforms, both of which deliver to the same inbox at the provider:
 *  - Strip a "+tag" suffix from the local part (all providers that support
 *    plus-addressing: Gmail, Outlook, Fastmail, …). `me+anything@x` → `me@x`.
 *  - For Gmail/Googlemail only, remove dots from the local part and fold
 *    googlemail.com onto gmail.com. `m.e@googlemail.com` → `me@gmail.com`.
 *
 * Deliberately conservative: dots are only stripped for Gmail, because for
 * most other providers `a.b@x` and `ab@x` are genuinely different mailboxes.
 */
export function canonicalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at === -1) return trimmed; // not an address shape — return as-is

  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  // Drop a +tag suffix on the local part (provider-agnostic).
  const plus = local.indexOf("+");
  if (plus !== -1) local = local.slice(0, plus);

  // Gmail-specific: dots are ignored, and googlemail is an alias of gmail.
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");

  return `${local}@${domain}`;
}
