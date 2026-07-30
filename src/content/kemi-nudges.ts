/**
 * Kemi's opening lines when SHE starts the conversation.
 *
 * These are deliberately hand-written rather than model-generated. A nudge
 * fires on an event (a story finished, a draft started), and running an AI
 * call at that moment would mean latency, cost, and a failure mode on a path
 * the reader never asked for — plus the "away" fallback would read as Kemi
 * saying nothing at all after promising a message. Canned-but-personalised
 * openers always land in voice, and the model takes over the moment the
 * reader actually replies.
 *
 * PERSONA RANGE — the point of this file. kemi-chat-greetings.ts spans six
 * moods (warm, flirty, book-obsessed, cheeky, gentle, energetic) and her
 * openers here span the same ones, so an unprompted message from Kemi sounds
 * like the same person who greets you, not a notification with her name on
 * it. Each pool below is ordered loosely by mood rather than grouped, so a
 * hash-based pick lands anywhere across her range.
 *
 * Every line: one move only, no stacked question-plus-pitch, never a script.
 * {title} is substituted with the story's title, {writer} with a writer's name.
 */

export type KemiNudgeKind =
  | "STORY_COMPLETED"
  | "FIRST_STORY_FINISHED"
  | "DRAFT_STARTED"
  | "STORY_PUBLISHED"
  | "STREAK_SAVE"
  | "FOLLOWED_WRITER_PUBLISHED";

/** A finished story is the single best moment to offer the next one — the
 *  reader is still inside the world of what they just read. */
const STORY_COMPLETED_LINES = [
  // warm
  "How was {title}? I want the honest reaction, not the polite one.",
  "You just finished {title}. Tell me what you thought.",
  // book-obsessed
  "{title}. That one got me a little. Did it get you too?",
  "You closed out {title} and I need your thoughts immediately.",
  // cheeky
  "{title}, done. And? Don't make me guess.",
  "So. {title}. Was I right or was I right?",
  // flirty
  "You and {title} just had a whole moment, huh. How was it?",
  // gentle
  "You finished {title}. Whenever you feel like talking about it, I'm here.",
  // energetic
  "{title}, done! Want something in the same vein, or a total curveball next?",
];

/** The very first story someone ever finishes on Kekere. Worth marking
 *  properly — this only ever happens once per reader. */
const FIRST_STORY_FINISHED_LINES = [
  "That's your first one finished, {title}. Let me have this moment.",
  "First story down. {title}. How do you feel?",
  "You just finished your first Kekere story, {title}. What'd you think, honestly?",
  "{title} — your first here. There's something nice about handing someone their first one. Want another?",
  "One down, {title}. I could get used to this.",
];

/** Fires when a writer starts a fresh draft. Encouragement, not applause —
 *  they've started, not finished, so "well done" would ring hollow. Kemi is
 *  curious about the work rather than evaluative of it. */
const DRAFT_STARTED_LINES = [
  // energetic
  "Ooh, new draft. What's it about?",
  // warm
  "Saw you started something new. How's it going so far?",
  // book-obsessed
  "You've started writing again. I'm nosy — what's it about?",
  // cheeky
  "Blank page, and you just went for it. Respect. What are you working on?",
  "Caught you starting a new draft. Spill or don't, your call.",
  // gentle
  "You've started something. However it's going today, that counts. What's it about?",
  // flirty
  "A new draft from you? Now I'm curious. Tell me more.",
];

/** The writer's story just went live. Genuine celebration — this is the
 *  moment months of work becomes something readers can actually find. */
const STORY_PUBLISHED_LINES = [
  "{title} is live. You did that. How's it feel?",
  "It's out — {title} is on the shelf, readers can find it right now. Congratulations, genuinely.",
  "{title} just went live and I'm going to be insufferable about it. Well done.",
  "Your story's live. {title}. Sit with that for a second before you start worrying about the next one.",
  "{title} is published. Someone out there's about to read it for the first time.",
];

/** Their streak lapses at midnight and they haven't read today. The tone that
 *  matters here is *offering*, not nagging — the message arrives with a short
 *  story already attached, so the line's whole job is to hand it over. Never
 *  guilt, never a countdown, never "don't lose your progress": a reading
 *  streak is meant to be a small pleasure, and the moment it starts making
 *  someone feel watched it stops being one. {title} is the pick. */
const STREAK_SAVE_LINES = [
  // warm
  "Your streak's still alive, barely — nothing read today yet. {title}'s short, if you want it.",
  "You haven't read today and it's getting late. {title}'s quick, if you want to keep the run going.",
  // cheeky
  "Streak's hanging by a thread. Not judging. Just handing you {title}, which is short.",
  "You haven't read anything today. {title} would fix that in one sitting.",
  // gentle
  "No pressure — but if you want to keep the streak, {title}'s small and easy.",
  "Still time today if you want it. {title} won't ask much of you.",
  // book-obsessed
  "Quick one before the day's out: {title}. Short, and I think it'll get you.",
  // energetic
  "Still time to get today on the board. {title}'s the fast way.",
  // flirty
  "You haven't read a thing today, and I noticed. {title}? It's short.",
];

/** Someone they follow just published. The reader opted into hearing about
 *  this writer specifically, so Kemi can lead with the name — it's the whole
 *  reason the message is interesting. {writer} and {title}. */
const FOLLOWED_WRITER_PUBLISHED_LINES = [
  // energetic
  "{writer} just published {title}. You follow them, thought you'd want to know first.",
  // warm
  "New one from {writer}: {title}. Straight to you, since you follow them.",
  // book-obsessed
  "{writer} has a new story up, {title}. I've been waiting for this one.",
  "Something new from {writer}: {title}. You already know if you want it.",
  // cheeky
  "{writer} went and published again. {title}. I'll leave it right here.",
  // gentle
  "{writer} published {title}. No rush, it'll keep.",
  // flirty
  "{writer} has something new out, and I came straight to you with it: {title}.",
];

const POOLS: Record<KemiNudgeKind, string[]> = {
  STORY_COMPLETED: STORY_COMPLETED_LINES,
  FIRST_STORY_FINISHED: FIRST_STORY_FINISHED_LINES,
  DRAFT_STARTED: DRAFT_STARTED_LINES,
  STORY_PUBLISHED: STORY_PUBLISHED_LINES,
  STREAK_SAVE: STREAK_SAVE_LINES,
  FOLLOWED_WRITER_PUBLISHED: FOLLOWED_WRITER_PUBLISHED_LINES,
};

/**
 * Picks an opener for this nudge. `seed` (the nudge's own id) makes the
 * choice stable — re-rendering or re-reading a delivered nudge never
 * silently rewords a message the reader has already seen.
 */
export function renderKemiNudge(
  kind: KemiNudgeKind,
  storyTitle: string | null | undefined,
  seed: string,
  writerName?: string | null,
): string {
  const pool = POOLS[kind] ?? POOLS.STORY_COMPLETED;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const line = pool[hash % pool.length];

  // Neither token is guaranteed at delivery time — the story could have been
  // deleted, the writer's account closed — so both fall back to wording that
  // still reads naturally rather than printing a hole where a name should be.
  const title = (storyTitle ?? "").trim();
  const writer = (writerName ?? "").trim();
  return line
    .replace(/\{title\}/g, title || "that one")
    .replace(/\{writer\}/g, writer || "a writer you follow");
}
