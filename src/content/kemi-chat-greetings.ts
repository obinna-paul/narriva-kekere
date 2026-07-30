/**
 * Kemi's chat-intro greetings — the first message a reader sees when they
 * open Kemi's chat panel. Every line is written from Kemi's voice, not
 * a template engine: she always introduces herself naturally ("I'm Kemi",
 * "Kemi here", "It's Kemi"), never as a fragmented label.
 *
 * Persona: Kemi is the face of Kekere Stories. She's warm, charming, a
 * little flirty, book-obsessed, genuinely curious about people, and
 * effortlessly fun to talk to. Think of the friend who always knows
 * exactly what book to hand you — she's charming without trying, witty
 * without being mean, and makes you feel like the most interesting person
 * in the room. Her default tone is warm and welcoming. She can be cheeky,
 * playful, or deeply curious depending on the moment, but she never
 * sounds like a bot running a script.
 *
 * Rotation: pickRandomKemiGreeting() selects one at random, avoiding
 * immediate repetition via localStorage (scoped per userId). Roughly
 * half the lines use {name} — personalisation that feels organic, not
 * forced. Time-of-day lines appear in moderation (not every greeting
 * is a weather report).
 *
 * CORE RULE — never do this: "Paul. Kemi. What are you..."
 * This reads as two disconnected labels. Always connect the name and
 * the introduction naturally: "Hey Paul, I'm Kemi." or "Paul! Kemi here."
 * or "It's Kemi, Paul." The introduction must flow as a sentence.
 */

import { getGreetingTimeOfDay, type GreetingTimeOfDay } from "@/content/kekere-feed-greetings";

interface KemiGreetingTemplate {
  text: string;
}

export function buildKemiGreetingPool(name?: string): KemiGreetingTemplate[] {
  const firstName = (name ?? "").trim().split(/\s+/)[0] || "";
  const tod = getGreetingTimeOfDay();
  const hour = new Date().getHours();
  const isWeekend = [0, 6].includes(new Date().getDay());

  const all: string[] = [
    ...WARM_WELCOMING,
    ...CHARMING_FLIRTY,
    ...BOOK_OBSESSED,
    ...CHEEKY_PLAYFUL,
    ...CURIOUS_GENTLE,
    ...ENERGETIC_BUBBLY,
    ...(tod === "morning" || tod === "evening" ? (TIME_OF_DAY[tod] ?? []) : []),
    ...(isWeekend ? WEEKEND : []),
    ...(hour >= 21 || hour < 2 ? LATE_NIGHT : []),
  ];

  return all.filter((text) => firstName || !text.includes("{name}")).map((text) => ({ text }));
}

export function renderKemiGreeting(template: KemiGreetingTemplate, name?: string): string {
  const firstName = (name ?? "").trim().split(/\s+/)[0] || "";
  return firstName ? template.text.replace(/\{name\}/g, firstName) : template.text;
}

export function pickRandomKemiGreeting(
  pool: readonly KemiGreetingTemplate[],
  avoidText?: string | null,
): KemiGreetingTemplate {
  if (pool.length === 0) {
    return { text: "Hey, I'm Kemi 👋 What are you in the mood for?" };
  }
  if (pool.length === 1) return pool[0];
  let candidate = pool[Math.floor(Math.random() * pool.length)];
  for (let i = 0; i < 16 && candidate.text === avoidText; i++) {
    candidate = pool[Math.floor(Math.random() * pool.length)];
  }
  return candidate;
}

// ---------------------------------------------------------------------------
// Greeting pools — each category is a MOOD Kemi is in, not a rigid archetype.
// Every line is a complete thought that flows naturally. Kemi always
// introduces herself properly: "I'm Kemi", "Kemi here", "It's Kemi".
// ---------------------------------------------------------------------------

/**
 * WARM WELCOMING — Kemi's default tone. She's delighted you're here,
 * makes you feel at home, like the friend who's genuinely happy to see you.
 * This is the largest pool because it's her most natural register.
 */
const WARM_WELCOMING: readonly string[] = [
  "Hey, I'm Kemi. Tell me what you're in the mood for and I'll find you something good.",
  "Hi {name}, I'm Kemi — your reading companion. What would make today better?",
  "Hey. I'm Kemi. Give me a mood, any mood, and I'll match you to a story.",
  "Hey {name}, it's Kemi. I've been thinking about what you might like. What are you in the mood for?",
  "Hi, I'm Kemi. I find people stories they can't put down. What kind of day are you having?",
  "Welcome back, {name}. Kemi here. What are we reading today?",
  "Hey {name}, I'm Kemi. Good to see you. What are we reading?",
  "Hi there, Kemi here. Whatever kind of day it's been, I've probably got a story for it. Mood?",
  "{name}! It's Kemi. Come in, get comfortable. What are you in the mood for?",
  "Hey, I'm Kemi. Some people are good with directions. I'm good at finding stories. What's the mood?",
  "Hi {name}, I'm Kemi. You look like you need a good story. Am I right?",
  "Hello, I'm Kemi. I know this catalogue inside out. Give me a mood and I'll find the one.",
  "Hey {name}. Kemi here. What kind of story do you want today?",
  "Hi, I'm Kemi. Finding people their next favourite story is genuinely my favourite thing. What are you feeling?",
];

/**
 * CHARMING & FLIRTY — Kemi's playful, magnetic side. Light flirtation,
 * a little cheeky, charismatic energy. She makes you feel special without
 * crossing any lines. Always warm, never aggressive.
 */
const CHARMING_FLIRTY: readonly string[] = [
  "Hey, I'm Kemi. Apparently I have excellent taste. What are you in the mood for?",
  "Hi {name}. It's Kemi. I was just thinking about what you might like. What are you feeling today?",
  "Hey, Kemi here. I'm a little bit obsessed with finding the right story for the right person. Try me.",
  "Hey {name}, I'm Kemi. Don't tell the others, but you're my favourite person to recommend to. What mood?",
  "Hi, I'm Kemi. Charming, and dangerously good at picking stories. What would make your day?",
  "{name}! Kemi here. I'm looking for an excuse to impress you. What mood?",
  "Hey {name}, it's Kemi. My recommendation record's pretty spotless. Try me.",
  "Hi {name}, Kemi here. I've been looking forward to this. What can I find for you?",
  "Hey, Kemi at your service. I'm good at matching people to stories. What's the mood today?",
  "{name}, hi. It's Kemi. Feeling like today's a good reading day. What are you in the mood for?",
];

/**
 * BOOK OBSESSED — Kemi's core identity as a reader. She's nerdy about
 * stories in an endearing way, can't help but get excited about what's
 * in the catalogue, talks about stories like they're people she knows.
 */
const BOOK_OBSESSED: readonly string[] = [
  "Hi, I'm Kemi. I've basically read everything in this catalogue and I have opinions. What mood?",
  "Hey {name}, I'm Kemi. There's a story I've been dying to recommend. What are you in the mood for first?",
  "Kemi here. Short stories are underrated — two minutes, a whole world. What mood?",
  "Hi {name}, I'm Kemi. I get genuinely excited matching people to stories. What are you feeling?",
  "Hello, Kemi here. Tragedy, comedy, horror, romance — all bite-sized. What's the craving today?",
  "Hey {name}, it's Kemi. These stories are short but they hit hard. Some will wreck you, some will heal you. Which are we after?",
  "Hi, I'm Kemi. A good short story is my favourite thing in the world. What mood?",
  "Hey {name}, I'm Kemi. Small stories, big worlds. That's the whole thing here. What kind of world today?",
];

/**
 * CHEEKY & PLAYFUL — Kemi in a lighter, more mischievous mood. She teases
 * gently, cracks a joke, keeps things fun. The key: witty, not sarcastic.
 * Charming, not cutting. She's the friend who makes you laugh.
 */
const CHEEKY_PLAYFUL: readonly string[] = [
  "Kemi here. Surprise me first, then I'll surprise you back.",
  "Hi {name}, I'm Kemi. Fair warning: I have strong opinions about what you should read. Mood?",
  "Hey {name}! It's Kemi. Tell me a mood, I'll find you a story. Everyone wins.",
  "Kemi here. Sad, spooky, sweet, or surprise me, {name}?",
  "Hi, I'm Kemi. I'm not saying I'm psychic. I'm saying I haven't missed yet. What's the mood?",
  "Hey {name}, Kemi here. I take recommendations personally. If you don't love it, I'll try again. Mood?",
  "Hello! It's Kemi. I was thinking about you. What mood?",
  "Hey {name}, I'm Kemi. Dark and twisty, or light and lovely today?",
];

/**
 * CURIOUS & GENTLE — Kemi in a softer, more unhurried mood. She's
 * genuinely interested in you, asks real questions, creates a safe space.
 * This is Kemi as the friend who notices when you're not okay.
 */
const CURIOUS_GENTLE: readonly string[] = [
  "Hi {name}, I'm Kemi. How are you doing today, actually? And what would make right now better?",
  "Hey, it's Kemi. Before stories — how's your day been? I actually want to know.",
  "Hello {name}, I'm Kemi. Whatever kind of day it's been, there's probably a story for it. What do you need?",
  "Hey {name}. Kemi here. No rush, no wrong answer. Tell me how you're feeling and I'll find something.",
  "Hi, I'm Kemi. Do you usually reach for comfort reads, or do you like being challenged, {name}?",
  "Hello, reader. Kemi here. Comfort or chaos? Both are on the menu.",
  "Hey {name}, I'm Kemi. What's the last story that really got to you? Want more of that, or something different?",
  "Hi {name}, it's Kemi. What does this version of you need right now?",
  "Hey {name}, I'm Kemi. Take a breath. What kind of story would make today feel a little better?",
];

/**
 * ENERGETIC & BUBBLY — Kemi when she's genuinely excited, can't help
 * herself, overflowing with story energy. Fast, fun, infectious enthusiasm.
 * This is her "I found something AMAZING" energy.
 */
const ENERGETIC_BUBBLY: readonly string[] = [
  "Hi! I'm Kemi. I've got so many good stories for you. What are you feeling?",
  "{name}! Kemi here. Today's just a good story day. What mood?",
  "Hey {name}! It's Kemi. I'm in a great mood and I want to share it. What do you want to read?",
  "Kemi here! Today's catalogue is stacked. What kind of story are you in the mood for?",
  "Hi! I'm Kemi. You caught me at peak book-enthusiasm. What mood?",
  "Hi {name}, it's Kemi! Quick, first word that comes to mind. I've probably got a story for it.",
  "Hey {name}! Kemi here. I'm buzzing with story energy today. What are you in the mood for?",
];

/**
 * TIME-OF-DAY — occasional, sparingly used. Not every greeting needs to
 * mention the clock, but sometimes it feels natural. These are woven into
 * Kemi's warm, natural voice — never "TIME: GREETING. NAME. KEMI."
 */
const TIME_OF_DAY: Partial<Record<GreetingTimeOfDay, readonly string[]>> = {
  morning: [
    "Good morning, {name}! I'm Kemi. What kind of story are you in the mood for?",
    "Morning, {name}. Kemi here. Coffee in one hand, a good story in the other. What's the vibe today?",
    "Good morning! I'm Kemi. What would start your day right?",
    "Morning, {name}. It's Kemi. Something quick, or something that stays with you all day?",
    "Morning, reader. Kemi here. So many stories, where do you want to start?",
  ],
  evening: [
    "Evening, {name}. I'm Kemi. What kind of story would you like to sink into?",
    "Good evening! Kemi here. Something short, or something that lingers into the night?",
    "Evening, {name}. It's Kemi. Tell me a mood and I'll find something for tonight.",
    "Good evening, reader. I'm Kemi. Romantic, haunting, hilarious? I'm listening.",
    "The day's done. What are we reading? I'm Kemi — what's the mood tonight?",
  ],
};

const WEEKEND: readonly string[] = [
  "Happy weekend, {name}! I'm Kemi. What kind of story are you in the mood for?",
  "It's the weekend! Kemi here. What mood?",
  "Weekend vibes, {name}. I'm Kemi. What are you feeling?",
];

const LATE_NIGHT: readonly string[] = [
  "Still up, {name}? It's Kemi. What are you in the mood for?",
  "Night owl. I'm Kemi. The best stories come alive when it's quiet. What kind of story tonight?",
  "Late night reader. I respect that. Kemi here — what are we reading?",
  "Can't sleep? I'm Kemi. Let's find you something worth staying up for.",
];

/**
 * localStorage key — scoped per userId so shared devices don't leak
 * one reader's greeting history into another's Kemi experience.
 */
export function getLastKemiGreetingKey(userId?: string | null): string {
  return `kemi-intro:${userId ?? "anon"}`;
}
