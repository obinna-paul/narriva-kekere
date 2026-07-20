/**
 * Rotating greetings for the feed's top-left header — replaces the static
 * "Kekere" wordmark. The feed is a protected route (see middleware.ts), so
 * every visitor here is a logged-in reader; there's no logged-out case to
 * design for.
 *
 * These are deliberately NOT brand copy — no mention of Kekere, cowries, or
 * any feature (the "personalized" pools below are the one exception: they
 * reference the reader's own activity, not the app itself). The whole point
 * of this spot is that it stops being about the app and starts being about
 * the person looking at their phone right now.
 *
 * Rotation: a greeting holds steady for GREETING_ROTATION_MS (see below),
 * then the next visit rolls a fresh one. `getFeedGreeting` picks
 * deterministically from a userId + local date + time-of-day + rotation-slot
 * seed, so the server-rendered initial paint is stable within a window (and
 * hydration-safe) yet still varies through the day even without JS.
 * `feed-content.tsx` then upgrades this client-side: on mount it keeps the
 * stored line if the window hasn't elapsed (so a reload or an away-and-back
 * never flickers it), otherwise it rolls a fresh random one — never
 * immediately repeating the last shown (all tracked in localStorage).
 *
 * Name usage is intentionally NOT 1:1 — using {name} on every line gets
 * uncanny fast, so roughly a third of the lines below use it and the rest
 * don't. A reader with no name on file simply never sees a {name} line
 * (filtered out in buildGreetingPool).
 */

export type GreetingTimeOfDay = "morning" | "afternoon" | "evening" | "night";

/**
 * How long a single greeting stays put before the next visit rerolls it.
 * Short enough that a reader who checks in through the day sees it change
 * several times; long enough that reloading the feed, or navigating away
 * and straight back, never changes it (that reload-churn was the original
 * complaint). Governs both the client rotation window (feed-content.tsx)
 * and the server's deterministic rotation slot (getFeedGreeting), so one
 * number controls the whole cadence.
 */
export const GREETING_ROTATION_MS = 30 * 60 * 1000; // 30 minutes

/** Which rotation window a given moment falls in — an epoch-based slot,
 *  used only to seed the deterministic SSR pick so the no-JS first paint
 *  itself rotates through the day rather than being frozen per time-of-day
 *  bucket. */
export function getRotationSlot(date: Date = new Date()): number {
  return Math.floor(date.getTime() / GREETING_ROTATION_MS);
}

interface GreetingTemplate {
  /** May contain "{name}" — substituted with the reader's first name. */
  text: string;
}

export interface GreetingPersonalization {
  name: string;
  /** Show lifecycle.firstTime lines until they've completed a first story. */
  isFirstTime?: boolean;
  /** Show lifecycle.longAbsence lines after a stretch of inactivity. */
  isLongAbsence?: boolean;
  continueReadingTitle?: string | null;
  followedWriterName?: string | null;
  topGenre?: string | null;
  storiesReadCount?: number;
  currentStreak?: number;
  savedCount?: number;
  newStoriesCount?: number;
  replyWriterName?: string | null;
  anniversaryYears?: number;
}

const TIME_OF_DAY: Record<GreetingTimeOfDay, readonly string[]> = {
  morning: [
    "Good morning, {name}.",
    "Morning, {name}. The stories are already awake.",
    "Rise and read, {name}.",
    "New day, new story.",
    "Coffee and a quick tale, {name}?",
    "Somewhere, a story is waiting.",
    "Early bird gets the best plot.",
    "Morning fuel: caffeine and fiction.",
    "Fresh page, {name}. Fresh start.",
    "Start the day in someone else's world.",
    "Good morning, reader. Let's begin.",
    "One story before the day begins?",
  ],
  afternoon: [
    "Afternoon, {name}. Escape for a bit.",
    "Afternoon slump? A story fixes that.",
    "Midday break, {name}?",
    "Steal ten quiet minutes.",
    "Good afternoon. Pause the noise.",
    "Lunch is over. The stories aren't.",
    "Long day? Short story.",
    "Halfway through the day, {name}.",
    "A little fiction to break things up.",
  ],
  evening: [
    "Evening, {name}. Wind down with a tale.",
    "The day's clocking out. The stories aren't.",
    "Something short and sweet tonight?",
    "Golden hour reads hit different.",
    "Evening, reader. Cozy up.",
    "Ease into the evening, {name}.",
    "Slow down. Pick a story.",
    "Good evening, {name}.",
  ],
  night: [
    "Night owl, {name}?",
    "Still up, {name}? One more won't hurt.",
    "The best stories come alive at night.",
    "Can't sleep? We won't tell.",
    "Midnight reader. Respect.",
    "The world's asleep. The stories aren't.",
    "Just one more, {name}? Famous last words.",
    "Perfect night for a ghost story.",
    "Quiet hours. Loud stories.",
    "The moon's up and so are you.",
    "3am thoughts? Make them fiction.",
    "Burning the midnight page, {name}?",
  ],
};

const ANYTIME_CASUAL: readonly string[] = [
  "Hey, {name}.",
  "There you are, {name}.",
  "Welcome back, {name}.",
  "Good to see you, {name}.",
  "Look who it is. Hi, {name}.",
  "{name}. Good timing.",
  "Missed you, {name}.",
  "Back again, {name}? We like that.",
  "Where to today, {name}?",
  "Right this way, {name}.",
  "You again? Great.",
  "We were just thinking about you.",
];

const ANYTIME_READING: readonly string[] = [
  "Small stories. Big worlds.",
  "Short stories, big feelings.",
  "One story leads to another.",
  "Come for one. Stay for five.",
  "Two minutes, one whole world.",
  "The bookmark missed you.",
  "Your next favorite story doesn't know it yet.",
  "Some stories are short. The feelings aren't.",
  "A short read is still a whole world.",
  "Pick a story, any story.",
  "Reading is a soft place to land.",
  "Long day? Short story.",
];

const ANYTIME_PUN: readonly string[] = [
  "Well-red, {name}.",
  "Shelf-care time.",
  "Novel idea: read something today.",
  "Booked and busy, {name}?",
  'You had me at "once upon a time."',
  "Plot twist: you're back.",
  "The suspense was killing us, {name}.",
  "Take it one page at a time.",
  "This is your sign to start that story.",
  "A story a day keeps the boredom away.",
];

const ANYTIME_WARM: readonly string[] = [
  "Glad you're here.",
  "You made time to read today. That counts.",
  "Take a breath. Then take a story.",
  "Whatever kind of day it's been, there's a story for it.",
  "This little corner is yours, {name}.",
  "No rush. The stories will wait.",
  "Be gentle with yourself today, {name}.",
  "You showed up. That's something.",
  "Welcome back to the quiet, {name}.",
];

const ANYTIME_CURIOSITY: readonly string[] = [
  "What are you reading today, {name}?",
  "What are you in the mood for, {name}?",
  "Feeling brave? Try a horror.",
  "In the mood to cry a little?",
  "Romance or mystery tonight, {name}?",
  "Surprise yourself. Read a new genre.",
  "Something short? Something strange? You choose.",
  "What kind of world today, {name}?",
];

const ANYTIME_RETURNING: readonly string[] = [
  "Back for more, {name}? Love that.",
  "Right on time, {name}.",
  "Your streak's alive, {name}.",
  "Consistency looks good on you, {name}.",
  "Same time tomorrow, {name}?",
];

const ANYTIME_WEEKEND: readonly string[] = [
  "Weekend, {name}. No plans, just plot.",
  "Saturdays were made for stories.",
  "Slow Sunday? Perfect for reading.",
  "The stories cleared their schedule for you.",
];

const LIFECYCLE_FIRST_TIME: readonly string[] = [
  "Welcome to Kekere, {name}.",
  "Welcome to Kekere. Let's find your first story.",
  "New here? Every great reader starts somewhere.",
  "First story's the hardest to pick. We'll help.",
  "Small stories, big worlds. Welcome in.",
  "Hi, {name}. Pull up a chair and a story.",
  "Fresh start. Endless stories.",
  "One tap and you're somewhere new. Welcome.",
  "Glad you found us, {name}.",
  "Your reading life starts now, {name}.",
];

const LIFECYCLE_LONG_ABSENCE: readonly string[] = [
  "It's been a while, {name}. Missed you.",
  "Look who's back. Welcome home, {name}.",
  "The stories kept your seat warm, {name}.",
  "Long time, {name}. Let's pick up where you left off.",
  "We saved your spot, {name}.",
  "Welcome back, stranger.",
  "It's been too quiet without you, {name}.",
  "New stories piled up while you were gone.",
  "Right where you left it, {name}.",
  "The library barely aged. Welcome back.",
];

const PERSONALIZED_CONTINUE_READING: readonly string[] = [
  "Still thinking about {story}, {name}?",
  "{story} is right where you left it.",
  "Ready to finish {story}?",
  "You left {story} on a cliff, {name}.",
  "{story} has an ending. Go get it.",
  "One more sitting and {story} is done.",
];

const PERSONALIZED_FOLLOWED_WRITER: readonly string[] = [
  "{writer} just published, {name}.",
  "New from {writer}.",
  "{writer} has something new for you.",
  "Fresh ink from {writer}, {name}.",
  "{name}, {writer} dropped a new story.",
];

const PERSONALIZED_TOP_GENRE: readonly string[] = [
  "In the mood for {genre} again, {name}?",
  "More {genre}? We know you.",
  "Your kind of night: {genre}.",
  "New {genre} just landed, {name}.",
  "{genre} called. It wants you back.",
];

const PERSONALIZED_MILESTONES: readonly string[] = [
  "{count} stories and counting, {name}.",
  "That's {streak} days straight, {name}. Wow.",
  "Day {streak}, {name}. Don't break the chain.",
  "You've read {count} stories. Legend.",
  "{count} down. Infinite to go.",
];

const PERSONALIZED_LIBRARY: readonly string[] = [
  "{saved} stories waiting in your library, {name}.",
  "Your library's calling — {saved} unread.",
  "{new} new stories since you left, {name}.",
  "{new} fresh reads waiting for you.",
];

const PERSONALIZED_REPLIES: readonly string[] = [
  "A writer wrote back, {name}.",
  "You've got a reply waiting, {name}.",
  "{writer} replied to your note.",
];

const PERSONALIZED_ANNIVERSARY: readonly string[] = [
  "Happy Kekere-versary, {name}!",
  "{years} year(s) of reading with us, {name}. Thank you.",
  "You joined a year ago today, {name}. Still glad you're here.",
];

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "";
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Milestone lines mix {count}-only and {streak}-only templates — keep each
 *  line out of the pool unless the specific value it needs is actually
 *  available, rather than gating the whole category on either being set. */
function buildMilestoneLines(count?: number, streak?: number): string[] {
  return PERSONALIZED_MILESTONES.flatMap((t) => {
    if (t.includes("{count}")) return count ? [t.replace(/\{count\}/g, String(count))] : [];
    if (t.includes("{streak}")) return streak ? [t.replace(/\{streak\}/g, String(streak))] : [];
    return [t];
  });
}

function buildLibraryLines(saved?: number, freshCount?: number): string[] {
  return PERSONALIZED_LIBRARY.flatMap((t) => {
    if (t.includes("{saved}")) return saved ? [t.replace(/\{saved\}/g, String(saved))] : [];
    if (t.includes("{new}")) return freshCount ? [t.replace(/\{new\}/g, String(freshCount))] : [];
    return [t];
  });
}

export function getGreetingTimeOfDay(date: Date = new Date()): GreetingTimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** Merges the current time-of-day pool with the always-on "anytime" pools,
 *  plus whichever lifecycle/personalized pools have real data behind them —
 *  then drops any {name} line if the reader has no name on file. */
export function buildGreetingPool(data: GreetingPersonalization, date: Date = new Date()): GreetingTemplate[] {
  const firstName = firstNameOf(data.name);

  const lines: string[] = [
    ...TIME_OF_DAY[getGreetingTimeOfDay(date)],
    ...ANYTIME_CASUAL,
    ...ANYTIME_READING,
    ...ANYTIME_PUN,
    ...ANYTIME_WARM,
    ...ANYTIME_CURIOSITY,
    ...ANYTIME_RETURNING,
    ...(isWeekend(date) ? ANYTIME_WEEKEND : []),
    ...(data.isFirstTime ? LIFECYCLE_FIRST_TIME : []),
    ...(data.isLongAbsence ? LIFECYCLE_LONG_ABSENCE : []),
    ...(data.continueReadingTitle
      ? PERSONALIZED_CONTINUE_READING.map((t) => t.replace(/\{story\}/g, data.continueReadingTitle!))
      : []),
    ...(data.followedWriterName
      ? PERSONALIZED_FOLLOWED_WRITER.map((t) => t.replace(/\{writer\}/g, data.followedWriterName!))
      : []),
    ...(data.topGenre ? PERSONALIZED_TOP_GENRE.map((t) => t.replace(/\{genre\}/g, data.topGenre!)) : []),
    ...buildMilestoneLines(data.storiesReadCount, data.currentStreak),
    ...buildLibraryLines(data.savedCount, data.newStoriesCount),
    ...(data.replyWriterName ? PERSONALIZED_REPLIES.map((t) => t.replace(/\{writer\}/g, data.replyWriterName!)) : []),
    ...(data.anniversaryYears
      ? PERSONALIZED_ANNIVERSARY.map((t) => t.replace(/\{years\}/g, String(data.anniversaryYears)))
      : []),
  ];

  return lines.filter((text) => firstName || !text.includes("{name}")).map((text) => ({ text }));
}

export function renderGreeting(template: GreetingTemplate, data: GreetingPersonalization): string {
  const firstName = firstNameOf(data.name);
  return firstName ? template.text.replace(/\{name\}/g, firstName) : template.text;
}

/** Deliberately unfussy — this only needs to be deterministic, not
 *  cryptographically sound, so the same (userId, day, time-of-day) always
 *  lands on the same index without persisting anything. */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(hash, 31) + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Deterministic pick — used for the server-rendered initial paint, so the
 *  client's first hydration pass matches exactly (no flash/mismatch). The
 *  client then upgrades to a random pick post-mount (see pickRandomGreeting
 *  and feed-content.tsx's useEffect). */
export function pickDeterministicGreeting(pool: readonly GreetingTemplate[], seed: string): GreetingTemplate {
  return pool[hashString(seed) % pool.length];
}

/** Random pick that avoids immediately repeating `avoidText` (best effort —
 *  gives up after a few tries so a tiny pool can't loop forever). */
export function pickRandomGreeting(pool: readonly GreetingTemplate[], avoidText?: string | null): GreetingTemplate {
  if (pool.length <= 1) return pool[0];
  let candidate = pool[Math.floor(Math.random() * pool.length)];
  for (let i = 0; i < 10 && candidate.text === avoidText; i++) {
    candidate = pool[Math.floor(Math.random() * pool.length)];
  }
  return candidate;
}

/** Server-side entry point — deterministic, for the initial SSR paint. */
export function getFeedGreeting(userId: string, data: GreetingPersonalization, date: Date = new Date()): string {
  const pool = buildGreetingPool(data, date);
  const seed = `${userId}|${localDateKey(date)}|${getGreetingTimeOfDay(date)}|${getRotationSlot(date)}`;
  const chosen = pickDeterministicGreeting(pool, seed);
  return renderGreeting(chosen, data);
}
