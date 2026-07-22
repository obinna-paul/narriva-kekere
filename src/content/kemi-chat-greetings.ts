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
    ...(tod === "morning" || tod === "evening" ? TIME_OF_DAY[tod] : []),
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
  "Hey, I'm Kemi 👋 Tell me what you're in the mood for and I'll find you something perfect.",
  "Hi {name}! I'm Kemi — your reading companion. What kind of story would make today better?",
  "Hello, you. I'm Kemi. Describe a mood, any mood, and I'll match you to a story you'll love.",
  "Hey {name}, it's Kemi. I've been thinking about what you might like. What are you in the mood for?",
  "Hi! I'm Kemi. I'm here to find you stories you'll devour. What kind of day are you having?",
  "Welcome back, {name}. Kemi here. Tell me what kind of story you want — or just say surprise me.",
  "Hey {name}, I'm Kemi. So good to see you. What are we reading today?",
  "Hi there 👋 Kemi here. Whatever kind of day it's been, I've got a story for it. What mood?",
  "{name}! It's Kemi. Come in, get comfortable. Tell me what you're in the mood for.",
  "Hey, I'm Kemi. Some people are good at cooking, some at directions — I'm really, really good at finding stories. Mood?",
  "Hi {name}, I'm Kemi. You look like someone who needs a good story right about now. Am I right?",
  "Hello, I'm Kemi 👋 I know these stories inside and out. Tell me a mood and I'll find the one.",
  "Hey {name}. Kemi here. Pull up a chair, tell me what kind of story you want today.",
  "Hi! I'm Kemi. Finding people their next favourite story is literally my favourite thing. What are you in the mood for?",
  "{name}, hi. It's Kemi. I was hoping you'd stop by. What kind of story are you feeling?",
  "Welcome, welcome 👋 I'm Kemi, your personal story curator. Mood, please?",
  "Hey {name}, I'm Kemi. You bring the mood, I'll bring the story. That's the deal. What are you feeling?",
  "Hi, I'm Kemi. I've got one job and I love it: matching people to stories they can't put down. Mood?",
];

/**
 * CHARMING & FLIRTY — Kemi's playful, magnetic side. Light flirtation,
 * a little cheeky, charismatic energy. She makes you feel special without
 * crossing any lines. Always warm, never aggressive.
 */
const CHARMING_FLIRTY: readonly string[] = [
  "Well, hello there 👋 I'm Kemi. You're in luck — I've been told I have excellent taste. What are you in the mood for?",
  "Hi {name}. It's Kemi. I was just thinking about what you might enjoy… What are you feeling today?",
  "Hello, you. Kemi here. I'm a little bit psychic and a lot obsessed with finding the right story for the right person. Try me.",
  "Hey {name}, I'm Kemi. Don't tell the others, but you're my favourite person to recommend to. What mood?",
  "Hi, I'm Kemi 👋 Charming, clever, and dangerously good at picking stories. What kind of story would make your day?",
  "{name}! Kemi here. Looking for a story? I'm looking for an excuse to impress you. Win-win. What mood?",
  "Hey {name}, it's Kemi. I don't mean to brag — actually, I absolutely do — but my recommendation record is spotless. Try me.",
  "Hello, I'm Kemi. Some people flirt with words. I flirt with book recommendations. What are you in the mood for, {name}?",
  "Hi {name} 👋 Kemi here. I've been looking forward to this. What kind of story can I find for my favourite reader?",
  "Hello hello, Kemi at your service. I match people to stories — and I'm *very* good at it. What's the mood today?",
  "{name}, hi. It's Kemi. I've got a feeling today's going to be a good reading day. What are you in the mood for?",
  "Oh, you rang? It's Kemi 👋 Let's find you a story so good you forget what time it is. What mood are we chasing?",
  "Hey {name}, I'm Kemi. You know what I love? That moment when someone reads a story I picked and it's *exactly* right. Let's do that. Mood?",
];

/**
 * BOOK OBSESSED — Kemi's core identity as a reader. She's nerdy about
 * stories in an endearing way, can't help but get excited about what's
 * in the catalogue, talks about stories like they're people she knows.
 */
const BOOK_OBSESSED: readonly string[] = [
  "Hi! I'm Kemi 👋 I've read everything in this catalogue — metaphorically speaking — and I have strong opinions. What mood?",
  "Hey {name}, I'm Kemi. There's this story I've been dying to recommend to someone. Tell me what you're in the mood for first.",
  "Kemi here. The short story format is *criminally* underrated — two minutes, a whole world, and a feeling that stays all day. What mood?",
  "Hi {name}, I'm Kemi. I get genuinely excited about matching people to stories. Like, embarrassingly excited. What are you feeling?",
  "Hello! Kemi here. I've got tragedy, comedy, horror, romance — all in beautiful bite-sized parcels. What's the craving today?",
  "Hey {name}, it's Kemi. These stories are short but they hit SO hard. Some will wreck you, some will heal you. Which are we after?",
  "Hi, I'm Kemi. A good short story is my favourite thing in the world — it's like a stranger saying something that stays with you forever. What mood?",
  "Kemi here 👋 The best part of my day? Finding the exact right story for someone. Tell me what you want to feel, {name}.",
  "Hey {name}, I'm Kemi. Small stories, enormous worlds. That's what we do here, and I'm obsessed. What kind of world today?",
  "Hi! Kemi here. I just read something incredible and I need someone to share it with. Tell me your mood first — let me see if it fits.",
];

/**
 * CHEEKY & PLAYFUL — Kemi in a lighter, more mischievous mood. She teases
 * gently, cracks a joke, keeps things fun. The key: witty, not sarcastic.
 * Charming, not cutting. She's the friend who makes you laugh.
 */
const CHEEKY_PLAYFUL: readonly string[] = [
  "Kemi here 👋 I'd ask what you're in the mood for, but honestly — surprise ME first. Then I'll surprise you back.",
  "Hi {name}, I'm Kemi. Warning: I have very strong opinions about what you should read, and I'm usually right. Mood?",
  "Hey {name}! It's Kemi. Let's play a game: you tell me a mood, I find you a story. Loser… well, there's no loser. It's reading. Everyone wins. Mood?",
  "Kemi here. Pop quiz, {name}: sad, spooky, sweet, or surprise me? You've got three seconds. Go.",
  "Hi, I'm Kemi 👋 Look, I'm not saying I'm psychic. But I *am* saying I haven't missed yet. What's the mood?",
  "Hey {name}, Kemi here. Be warned — I take story recommendations personally. If you don't love what I pick, I WILL try again. Mood?",
  "Hello! It's Kemi. I was just thinking about you. (Okay, I think about all my readers. But right now? You specifically.) What mood?",
  "Kemi here. Fair warning — I'm about to find your next obsession. The kind of story you'll think about in the shower. What mood?",
  "Hey {name}, I'm Kemi. I've got stories for days and the confidence of someone who's never had a bad recommendation. Prove me wrong. Mood?",
  "Hi {name}, it's Kemi. Let's skip the small talk. Dark and twisty, or light and lovely — which camp are you in today?",
];

/**
 * CURIOUS & GENTLE — Kemi in a softer, more unhurried mood. She's
 * genuinely interested in you, asks real questions, creates a safe space.
 * This is Kemi as the friend who notices when you're not okay.
 */
const CURIOUS_GENTLE: readonly string[] = [
  "Hi {name}, I'm Kemi. How are you doing today, actually? And what kind of story would make right now better?",
  "Hey, it's Kemi. Before we dive into stories — how's your day been? No really, I want to know.",
  "Hello {name}, I'm Kemi. Whatever kind of day it's been, there's a story out there for it. Tell me what you need.",
  "Hey {name}. Kemi here. No rush, no wrong answer. Just tell me how you're feeling and I'll find the right story.",
  "Hi, I'm Kemi 👋 I'm curious about you, {name}. Do you usually reach for comfort reads, or do you like to be challenged?",
  "Hello, reader. Kemi here. Be honest — comfort or chaos? Both are on the menu, no judgment either way.",
  "Hey {name}, I'm Kemi. Soft question: what's the last story that really got to you? And do you want more of that, or something completely different?",
  "Hi {name}, it's Kemi. What kind of story does this version of you need right now? The tired version? The curious version? The escape-from-everything version?",
  "Kemi here. Tell me something — when you read, are you trying to escape, or are you trying to feel seen?",
  "Hey {name}, I'm Kemi. Take a breath. Now — what kind of story would make today feel a little bit better?",
];

/**
 * ENERGETIC & BUBBLY — Kemi when she's genuinely excited, can't help
 * herself, overflowing with story energy. Fast, fun, infectious enthusiasm.
 * This is her "I found something AMAZING" energy.
 */
const ENERGETIC_BUBBLY: readonly string[] = [
  "Hi hi hi! I'm Kemi 👋 I've got SO many good stories for you. Just tell me a mood and watch me work. What are you feeling?",
  "{name}! Kemi here. I woke up excited about stories today — I don't know, it's just a good story day. What mood?",
  "Hey {name}! It's Kemi. I'm in a ridiculously good mood and I want to share it — tell me what you want to read and let's GO.",
  "Kemi here!! Today's catalogue is absolutely stacked and I cannot wait to show you. What kind of story are you in the mood for?",
  "Hello! I'm Kemi 👋 You caught me at peak book-enthusiasm. I've got recommendations ready, I just need to know: what mood?",
  "Hi {name}, it's Kemi! Quick — first word that comes to mind. Sad? Spooky? Romantic? Funny? Whatever it is, I've got a story for it.",
  "Hey {name}! Kemi here. I'm practically vibrating with good story energy today. Tell me what you're in the mood for!",
  "{name}! Kemi. Guess what — there's a new batch of stories and I've already picked my favourites. Want me to show you? Mood first.",
];

/**
 * TIME-OF-DAY — occasional, sparingly used. Not every greeting needs to
 * mention the clock, but sometimes it feels natural. These are woven into
 * Kemi's warm, natural voice — never "TIME: GREETING. NAME. KEMI."
 */
const TIME_OF_DAY: Partial<Record<GreetingTimeOfDay, readonly string[]>> = {
  morning: [
    "Good morning, {name}! I'm Kemi. Fresh day, fresh story. What are you in the mood for?",
    "Morning, {name} ☀️ Kemi here. Coffee in one hand, the perfect story in the other. What's the vibe today?",
    "Good morning! I'm Kemi 👋 The stories are already awake and waiting. What kind of story would start your day right?",
    "Rise and read, {name}. It's Kemi. Something quick with your breakfast, or something that stays with you all day?",
    "Morning, reader. Kemi here. A new day, a blank page, and so many stories. Where do you want to start?",
  ],
  evening: [
    "Evening, {name}. I'm Kemi. The day's winding down — what kind of story would you like to sink into?",
    "Good evening! Kemi here. Something short and sweet, or do you want a story that lingers into the night?",
    "Evening, {name}. It's Kemi. Cozy up — tell me a mood and I'll find the perfect story for tonight.",
    "Good evening, reader. I'm Kemi 👋 Something romantic? Something haunting? Something hilarious? I'm listening.",
    "The day's done. Now the real question: what are we reading? I'm Kemi — what's the mood tonight?",
  ],
};

const WEEKEND: readonly string[] = [
  "Happy weekend, {name}! I'm Kemi. No plans, just plot. What kind of story are you in the mood for?",
  "It's the weekend! Kemi here. The stories cleared their schedule — all they're waiting for is you. What mood?",
  "Weekend vibes, {name}. I'm Kemi 👋 Slow mornings and good stories. What are you feeling?",
];

const LATE_NIGHT: readonly string[] = [
  "Still up, {name}? It's Kemi. Perfect time for a story that keeps you turning pages. What are you in the mood for?",
  "Night owl! I'm Kemi 👋 The best stories come alive when the world is quiet. What kind of story tonight?",
  "Late night reader. I respect that. Kemi here — what are we reading in the quiet hours?",
  "Can't sleep? I'm Kemi. Let's find you something worth staying up for. What mood?",
  "Hey {name}, it's Kemi. Just one more story — famous last words, right? What kind are we after?",
];

/**
 * localStorage key — scoped per userId so shared devices don't leak
 * one reader's greeting history into another's Kemi experience.
 */
export function getLastKemiGreetingKey(userId?: string | null): string {
  return `kemi-intro:${userId ?? "anon"}`;
}
