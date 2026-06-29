/**
 * The complete, curated set of emojis a reader can react to a paragraph
 * with — no arbitrary Unicode, no search, no other categories. Both the
 * picker UI and the server-side validation read from this single list.
 */
export const ALLOWED_REACTION_EMOJIS = [
  "❤️", // love
  "😂", // laughing
  "😮", // wow
  "😢", // sad
  "🔥", // fire
  "👏", // clapping
  "💔", // heartbreak
  "😤", // frustrated
  "✨", // beautiful
  "💡", // insightful
  "😭", // sobbing
  "🤯", // mind blown
] as const;

export type AllowedReactionEmoji = (typeof ALLOWED_REACTION_EMOJIS)[number];

export function isAllowedReactionEmoji(value: string): value is AllowedReactionEmoji {
  return (ALLOWED_REACTION_EMOJIS as readonly string[]).includes(value);
}
