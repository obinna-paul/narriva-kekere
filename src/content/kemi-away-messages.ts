/**
 * Shown instead of a real reply whenever the Groq call fails — unset API
 * key, rate limit, timeout, or any other error. Kept fun and in-character
 * rather than a bare error message. A large enough pool that a reader
 * retrying a few times doesn't see the same line twice in a row.
 */
export const KEMI_AWAY_MESSAGES: readonly string[] = [
  "Kemi went to the market for egusi and fufu — try her again in a bit 🍲",
  "Kemi's taking a quick nap. Give her a few minutes and try again.",
  "Kemi's phone is charging in another room. Back shortly!",
  "Kemi stepped out to gist with a neighbor. She'll be right back.",
  "Kemi's mid-chapter on something and lost track of time — try again soon.",
  "Kemi's queuing for suya. Priorities. Check back in a moment.",
  "Kemi's WiFi is doing its own thing right now. One sec.",
  "Kemi is off somewhere pretending she isn't reading spoilers she promised not to share. Try again shortly.",
  "Kemi's asleep on the job, literally. Give her a minute to wake up.",
  "Kemi's in the middle of a very dramatic phone call. She'll be back.",
  "Kemi went to charge her vibes. Try again in a bit.",
  "Kemi's currently arguing with a vendor about the price of tomatoes. Hang tight.",
];

export function randomKemiAwayMessage(): string {
  return KEMI_AWAY_MESSAGES[Math.floor(Math.random() * KEMI_AWAY_MESSAGES.length)];
}
