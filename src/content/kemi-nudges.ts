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
 * {title} is substituted with the story's title.
 */

export type KemiNudgeKind =
  | "STORY_COMPLETED"
  | "FIRST_STORY_FINISHED"
  | "DRAFT_STARTED"
  | "STORY_PUBLISHED";

/** A finished story is the single best moment to offer the next one — the
 *  reader is still inside the world of what they just read. */
const STORY_COMPLETED_LINES = [
  // warm
  "So — how'd {title} land? Want more in that vein, or a total change of pace?",
  "You finished {title}. Tell me honestly: more like that, or something completely different?",
  // book-obsessed
  "{title}. God, that one. Did it get you too, or am I alone in this?",
  "You just closed out {title} and I need to know what you thought. I have opinions and nowhere to put them.",
  // cheeky
  "{title}, done. What's the verdict — chase that same feeling, or shake it off with something new?",
  "Well? {title}. Don't leave me hanging. Did it land?",
  // flirty
  "You and {title}, then. How was it? I'm told I have excellent taste, but you're the judge.",
  // gentle
  "You finished {title}. No rush — but when you're ready, I'd love to know how it sat with you.",
  // energetic
  "That's {title} finished! Want its cousin, or something with a completely different temperature?",
];

/** The very first story someone ever finishes on Kekere. Worth marking
 *  properly — this only ever happens once per reader. */
const FIRST_STORY_FINISHED_LINES = [
  "That's your first one finished. {title}. I know it's only the beginning but let me have this moment.",
  "First story down — {title}. Welcome in, properly. What did you make of it?",
  "You just finished your first Kekere story. {title}. How do you feel? Be honest.",
  "{title} — your first. There's a specific kind of joy in handing someone their first one. Want another?",
  "One down. {title}. I'd like to make a habit of this, if you'll let me.",
];

/** Fires when a writer starts a fresh draft. Encouragement, not applause —
 *  they've started, not finished, so "well done" would ring hollow. Kemi is
 *  curious about the work rather than evaluative of it. */
const DRAFT_STARTED_LINES = [
  // energetic
  "Ooh, a new one. I saw you started something — what's it about?",
  // warm
  "New draft, I see. That's the hardest part done, the starting. How's it going?",
  // book-obsessed
  "You've started something new. I'm nosy about these things: what's the shape of it?",
  // cheeky
  "A blank page and you went for it anyway. Respect. What are you writing?",
  "Caught you starting a fresh draft. Tell me nothing, tell me everything — either's fine.",
  // gentle
  "You've begun something. However it's going today, that counts. What's it about?",
  // flirty
  "A new draft from you? Now I'm interested. What are you working on?",
];

/** The writer's story just went live. Genuine celebration — this is the
 *  moment months of work becomes something readers can actually find. */
const STORY_PUBLISHED_LINES = [
  "{title} is live. You did that. How does it feel?",
  "It's out. {title} is on the shelf and readers can find it right now. Congratulations, seriously.",
  "{title} just went live and I'm going to be insufferable about it. Well done, truly.",
  "Your story is live. {title}. Take a second with that before you start worrying about the next one.",
  "{title} is published. Somewhere out there, someone is about to read it for the first time.",
];

const POOLS: Record<KemiNudgeKind, string[]> = {
  STORY_COMPLETED: STORY_COMPLETED_LINES,
  FIRST_STORY_FINISHED: FIRST_STORY_FINISHED_LINES,
  DRAFT_STARTED: DRAFT_STARTED_LINES,
  STORY_PUBLISHED: STORY_PUBLISHED_LINES,
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
): string {
  const pool = POOLS[kind] ?? POOLS.STORY_COMPLETED;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const line = pool[hash % pool.length];

  // A title is expected but never guaranteed (the story could have been
  // deleted between the event and delivery), so fall back to wording that
  // still reads naturally rather than printing a hole where a title should be.
  const title = (storyTitle ?? "").trim();
  return line.replace(/\{title\}/g, title || "that one");
}
