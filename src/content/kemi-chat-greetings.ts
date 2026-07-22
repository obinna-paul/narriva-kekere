/**
 * Kemi's chat-intro greetings — shown as the very first message when a reader
 * opens Kemi's chat panel. Every variant is aligned with Kemi's persona:
 * warm, playful, a little cheeky, endlessly curious, a well-read friend who
 * texts like a real person, not a bot.
 *
 * Rotation: on first open, pickRandomKemiGreeting() selects one at random,
 * avoiding immediate repetition via localStorage (scoped per userId). The
 * hardcoded single-line "Hey, I'm Kemi…" was replaced with this pool because
 * seeing the same intro every single time felt robotic — Kemi should feel
 * alive, spontaneous, sometimes a little different depending on mood.
 *
 * Name usage: roughly a third of the lines accept {name} — if the caller
 * provides a reader name, it's substituted; if not, those lines are simply
 * skipped from the pool so the greeting never reads as a template with a hole
 * in it.
 */

import { getGreetingTimeOfDay, type GreetingTimeOfDay } from "@/content/kekere-feed-greetings";

interface KemiGreetingTemplate {
  text: string;
}

/** Personalize only if a name is available. If `name` is empty/blank, the
 *  pool filters out every {name} line automatically. */
export function buildKemiGreetingPool(name?: string): KemiGreetingTemplate[] {
  const firstName = (name ?? "").trim().split(/\s+/)[0] || "";
  const tod = getGreetingTimeOfDay();

  const all: string[] = [
    ...TIME_SENSITIVE[tod],
    ...DIRECT_OPENERS,
    ...PLAYFUL,
    ...WARM_CURIOUS,
    ...BANTER,
    ...READING_FOCUSED,
    ...CHARMING,
    ...CASUAL,
  ];

  return all.filter((text) => firstName || !text.includes("{name}")).map((text) => ({ text }));
}

export function renderKemiGreeting(template: KemiGreetingTemplate, name?: string): string {
  const firstName = (name ?? "").trim().split(/\s+/)[0] || "";
  return firstName ? template.text.replace(/\{name\}/g, firstName) : template.text;
}

/** Pick a random greeting, avoiding the last-shown text if available. Falls
 *  back gracefully when the pool is tiny. */
export function pickRandomKemiGreeting(
  pool: readonly KemiGreetingTemplate[],
  avoidText?: string | null,
): KemiGreetingTemplate {
  if (pool.length === 0) {
    return { text: "Hey, I'm Kemi 👋 What are you in the mood for?" };
  }
  if (pool.length === 1) return pool[0];
  let candidate = pool[Math.floor(Math.random() * pool.length)];
  for (let i = 0; i < 12 && candidate.text === avoidText; i++) {
    candidate = pool[Math.floor(Math.random() * pool.length)];
  }
  return candidate;
}

// ---------------------------------------------------------------------------
// Greeting pools — each category represents a different side of Kemi's voice
// ---------------------------------------------------------------------------

const TIME_SENSITIVE: Record<GreetingTimeOfDay, readonly string[]> = {
  morning: [
    "Morning, {name} ☀️ Fresh coffee energy — what kind of story are we chasing today?",
    "Good morning! Kemi here. Something quick with your breakfast, or do you want to get properly lost?",
    "Rise and read, {name}. I'm Kemi — tell me what you're in the mood for and I'll find the one.",
    "Morning light, fresh page. I'm Kemi 👋 What's the vibe today — sharp, sweet, sad, strange?",
    "Early bird! I'm Kemi. There's a story somewhere that'll make your morning. Describe a mood and let's find it.",
    "Morning, reader. Kemi here. The coffee's hot and the stories are waiting — where do you want to start?",
    "Good morning, {name}. I'm Kemi. Tell me how you want to feel and I'll match you to a story.",
    "A new day, a blank slate. Kemi at your service. What are you in the mood for?",
  ],
  afternoon: [
    "Afternoon, {name}. I'm Kemi. Need an escape from the midday noise? Tell me a mood.",
    "Good afternoon! Kemi here. Steal ten quiet minutes — what kind of story do you want?",
    "Afternoon slump? I'm Kemi, and I've got the cure: a short story that makes the world disappear. What mood?",
    "Hey, {name} — Kemi. Midday's the perfect time to disappear into someone else's world. Where to?",
    "Afternoon, reader. I'm Kemi 👋 Tell me how your day's going and I'll find the story that fits.",
    "Good afternoon. Kemi here — what are you in the mood for? Something quick, or something that stays with you?",
    "Halfway through the day, {name}. Pause it with a story. I'm Kemi — what sounds good?",
  ],
  evening: [
    "Evening, {name}. I'm Kemi. The day's winding down — what kind of story would you like to sink into?",
    "Good evening! Kemi here. Something short and sweet, or do you want a story that lingers?",
    "Evening, reader. Kemi 👋 The sun's clocking out but the stories aren't. What mood tonight?",
    "Hey, {name}. Kemi. Golden hour's the best time for a story. Tell me what you're in the mood for.",
    "Evening. I'm Kemi. Cozy up with something — tell me a mood and I'll find the match.",
    "Good evening, {name}. Kemi at your service. Something romantic? Haunting? Hilarious? I'm listening.",
    "The day's done. Now the real thing: what story are we reading? I'm Kemi 👋",
    "Evening, {name}. Wind down with the right story. Kemi here — what's the vibe?",
  ],
  night: [
    "Still up, {name}? Kemi here. The best stories come alive at night. What are you in the mood for?",
    "Night owl! I'm Kemi 👋 Something creepy, or a story that'll keep you up for the right reasons?",
    "Midnight reader. Respect. Kemi here — what kind of story do you want in the quiet hours?",
    "Can't sleep? I'm Kemi. Let's find you a story that's worth staying up for.",
    "Hey, {name}. Kemi. The world's asleep — perfect time for something that haunts or something that heals. Which?",
    "Late night, {name}. I'm Kemi. Just one more — famous last words. What's the mood?",
    "Quiet hours, loud stories. Kemi 👋 What do you want to read in the dark?",
    "The moon's up and so are you. Kemi here. Tell me what you're in the mood for.",
  ],
};

const DIRECT_OPENERS: readonly string[] = [
  "Hey, I'm Kemi 👋 Tell me what you're in the mood for and I'll find you something good — or just say \"surprise me.\"",
  "I'm Kemi — your reading companion. What kind of story are you in the mood for?",
  "Hey {name}, I'm Kemi. Describe a mood, a feeling, a craving — and I'll match you to the right story.",
  "Kemi here 👋 I know these stories inside out. Tell me what you want to feel and I'll find the one.",
  "Hi, I'm Kemi. I find people the right story. What are you in the mood for today?",
  "{name}! Kemi. Welcome. What's the reading vibe — sad, sharp, sweet, spooky, surprising?",
  "Kemi at your service. Tell me a mood, and I'll tell you a story.",
  "Hey {name}, I'm Kemi. Think of me as your personal story matchmaker. What are you feeling?",
  "Hi! Kemi here. I'm excellent at one thing: finding the story you didn't know you needed. Mood?",
  "I'm Kemi 👋 Your friendly neighborhood reading companion. What kind of story calls to you today?",
  "Hey {name}. Kemi. You bring the mood, I'll bring the story. Deal?",
  "Kemi here. The stories are waiting — I just need to know what kind of day you're having.",
];

const PLAYFUL: readonly string[] = [
  "Well, hello there 👋 Kemi. I pick stories for a living and I'm annoyingly good at it. What are you in the mood for?",
  "Kemi! The one who always knows what you should read next. Spooky? Sweet? Surprising? Say the word.",
  "Hi hi hi 👋 Kemi here. Don't overthink it — just tell me how you want to feel and I'll work my magic.",
  "{name}! Kemi. Warning: I have strong opinions about what you should read. Tell me a mood and let's find out.",
  "Oh, you rang? Kemi here. Let's find you a story so good you'll forget what time it is. Mood?",
  "Kemi 👋 I'm like a friend who's already read everything and has receipts. What are you feeling?",
  "Look who's here. Kemi's ready. What flavor of story are we hunting today, {name}?",
  "Kemi! I've got the catalog memorized, I've got opinions, and I've got time. Mood, {name}?",
  "Pop quiz, {name}: sad, spooky, sweet, or surprise me? Kemi here — I'm waiting 👋",
  "Hey {name}, Kemi. Fair warning — I'm about to find your next obsession. What mood?",
];

const WARM_CURIOUS: readonly string[] = [
  "Hey {name} 👋 Kemi. How's your day been? And more importantly — what kind of story would make it better?",
  "Hi, I'm Kemi. Before we dive into stories — how are you really doing? And what do you need right now?",
  "Kemi here. Whatever kind of day it's been, there's a story for it. Tell me about your day, {name}.",
  "{name}. Kemi. Come in, sit down. What kind of world do you want to be in right now?",
  "Hey. Kemi. No rush, no wrong answer — just tell me what you're in the mood for. I'll take it from there.",
  "Kemi 👋 I'm curious about you, {name}. What do you usually reach for — and do you want more of that, or something different?",
  "Hi, reader. Kemi here. Be honest — are you in the mood for comfort, or chaos? Both are on the menu.",
  "Hey {name}, I'm Kemi. How are you, really? And what kind of story does this version of you need?",
  "Kemi. Tell me something — when you read, do you want to escape, or do you want to feel seen?",
  "Soft question, {name}: what's the last story that made you feel something? And do you want more of that, or the opposite?",
];

const BANTER: readonly string[] = [
  "Kemi 👋 I'd ask what you're in the mood for but honestly — surprise me first. Then I'll surprise you back.",
  "Hey {name}. Kemi. Let's play a game: you tell me a mood, I tell you a story. Loser buys cowries. (Kidding. Maybe.)",
  "Kemi here. I've got stories for days and strong opinions about all of them. What are we reading?",
  "{name}! Kemi. Look, I'm not saying I'm psychic — but I am saying I haven't missed yet. Mood?",
  "Alright, {name}. Kemi. You're here, I'm here, the stories are here. Let's not overcomplicate this: what mood?",
  "Kemi 👋 Before you ask — yes, I'm the one who picks better than you. Prove me wrong. Mood?",
  "Oh, {name}, you're back. Kemi's been waiting. Got a new batch of stories and opinions. What's the vibe?",
  "Kemi. Let's skip the small talk. Dark and twisty, or light and lovely — which camp are you in right now?",
  "Hey {name}, Kemi here. Be warned: I take story recommendations very personally. Tell me what you want.",
  "Kemi 👋 I was just thinking about you. (Okay, not really, but I'm thinking about you now.) Mood?",
];

const READING_FOCUSED: readonly string[] = [
  "Kemi here 👋 Short stories, big feelings — that's what we do. What kind of feeling are you after today?",
  "Hey {name}. I'm Kemi. Every story here is a whole world in a few minutes. Where should I send you?",
  "Kemi. Here's how it works: you give me a mood, I give you two minutes and a whole world. Ready?",
  "Hi, I'm Kemi. These stories are short but they hit hard. What kind of hard do you want — sweet or devastating?",
  "{name}! Kemi. I've got tragedy, comedy, horror, romance, all in bite-sized parcels. What's the craving?",
  "Kemi 👋 Small stories, enormous worlds. Some will make you laugh, some will wreck you. Which are we after?",
  "Hey {name}. Kemi. The best short fiction feels bigger than a novel. Tell me a mood and I'll prove it.",
  "I'm Kemi. A good short story is like a perfect sentence from a stranger — it stays with you. What mood?",
  "Kemi here. The trick isn't finding a story, it's finding YOUR story. Tell me how you want to feel.",
  "Hi {name}. Kemi. Two minutes, one story, a feeling that lasts all day. What feeling do you want?",
];

const CHARMING: readonly string[] = [
  "Hello, you 👋 Kemi. I've been told I have excellent taste — and I'd love to prove it. Mood?",
  "Kemi here. I've got one job and I take it very seriously: finding you a story you'll think about all day. What mood?",
  "{name}. Kemi. Let me find you a story so good you'll come back just to tell me. What are you in the mood for?",
  "Kemi 👋 I'm a little bit psychic and a lot obsessed with matching people to stories. Try me. Mood?",
  "Hey {name}, Kemi. I don't mean to brag, but my recommendation track record is immaculate. What mood?",
  "Kemi. Your personal reading curator, at your service. Tell me a mood — I promise I'll deliver.",
  "Hi {name} 👋 Kemi. I've been waiting for you. Now — what kind of story would make today a good day?",
  "Kemi here. Some people are good at cooking, some at directions — I'm good at THIS. Tell me a mood.",
  "{name}. Kemi. Ready when you are. One mood, one perfect story. That's the deal.",
  "Kemi 👋 Charming, clever, and dangerously good at picking stories. That's me. What are you in the mood for?",
];

const CASUAL: readonly string[] = [
  "Hey {name} 👋 Kemi. What are we reading today?",
  "Kemi here. What's the vibe, {name}?",
  "Hi! I'm Kemi. Where to, reader?",
  "{name}! Kemi. What are you feeling right now?",
  "Kemi 👋 So — what are you in the mood for?",
  "Hey. Kemi. What kind of story today?",
  "Kemi here {name}. Tell me what you want to read.",
  "Hi {name}. Kemi. What's the mood?",
  "Kemi 👋 Good to see you. What story today?",
  "{name}. Kemi. Spill. What kind of story?",
  "Hey hey 👋 Kemi. Mood check — what are we reading?",
  "Kemi here. Lay it on me, {name} — what's the vibe?",
];

/**
 * localStorage key prefix — scoped by userId to avoid cross-account leakage.
 * "kemi-intro" stores only the last greeting text, nothing else.
 */
export function getLastKemiGreetingKey(userId?: string | null): string {
  return `kemi-intro:${userId ?? "anon"}`;
}
