/**
 * Wordlist-based profanity check — a deliberately blunt v1 filter, not a
 * comprehensive one (a real one would need an external moderation API,
 * which is out of scope here — same call the app already makes for
 * plagiarism detection). Good enough to stop casual abuse in notes to
 * writers without adding a paid dependency; can be swapped for a real
 * service later without changing the call sites.
 */

const BLOCKED_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "cunt",
  "dick",
  "piss",
  "whore",
  "slut",
  "faggot",
  "nigger",
  "nigga",
  "retard",
  "rape",
  "kill yourself",
  "kys",
] as const;

// Common leetspeak substitutions, so "b1tch" / "a$$hole" still trip the
// filter — applied before matching, not a full normalization pass.
const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join("");
}

const WORD_PATTERNS = BLOCKED_WORDS.map((word) => {
  // Multi-word phrases ("kill yourself") match as a literal substring;
  // single words get \b boundaries so "class" doesn't trip on "ass".
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return word.includes(" ") ? new RegExp(escaped) : new RegExp(`\\b${escaped}\\b`);
});

export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  return WORD_PATTERNS.some((pattern) => pattern.test(normalized));
}
