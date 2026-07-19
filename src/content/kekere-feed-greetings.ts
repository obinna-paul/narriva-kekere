/**
 * Rotating greetings for the feed's top-left header — replaces the static
 * "Kekere" wordmark with something that changes on every page load, the
 * same way the login quotes do (see kekere-login-quotes.ts) and for the
 * same reason: feed/page.tsx is force-dynamic, so a fresh server render —
 * and a fresh random pick — happens every time the page loads or reloads.
 *
 * Filtered two ways before picking: by the server's current time of day
 * (see getGreetingTimeOfDay — a small skew against a reader's exact local
 * time is an acceptable trade for keeping this a simple, already-proven
 * server-side pattern rather than a client hydration dance), and by
 * whether a first name is available to personalize with at all (logged-out
 * visitors, or accounts with no name on file, only ever see the
 * name-free lines).
 */

export type GreetingTimeOfDay = "morning" | "afternoon" | "evening" | "night";

interface GreetingTemplate {
  /** May contain "{name}" — only ever used when a first name is available. */
  text: string;
  /** Omitted = fits any time of day. */
  timeOfDay?: readonly GreetingTimeOfDay[];
}

const GREETINGS: readonly GreetingTemplate[] = [
  // Morning (5am–11:59am)
  { text: "Morning, {name}.", timeOfDay: ["morning"] },
  { text: "Rise and read, {name}.", timeOfDay: ["morning"] },
  { text: "Good morning, {name}.", timeOfDay: ["morning"] },
  { text: "Coffee first, story after.", timeOfDay: ["morning"] },
  { text: "Morning, {name}. New chapter.", timeOfDay: ["morning"] },
  { text: "Up early? Bold move.", timeOfDay: ["morning"] },
  { text: "First light, first page.", timeOfDay: ["morning"] },
  { text: "Morning, {name}. What's the plan?", timeOfDay: ["morning"] },
  { text: "Slow start, good story.", timeOfDay: ["morning"] },
  { text: "Morning, {name}. What's trending today?", timeOfDay: ["morning"] },
  { text: "Good morning. Ready when you are.", timeOfDay: ["morning"] },
  { text: "Morning, {name}. One page won't hurt.", timeOfDay: ["morning"] },

  // Afternoon (12pm–4:59pm)
  { text: "Afternoon, {name}.", timeOfDay: ["afternoon"] },
  { text: "Taking five, {name}?", timeOfDay: ["afternoon"] },
  { text: "Good afternoon.", timeOfDay: ["afternoon"] },
  { text: "Lunch break reading?", timeOfDay: ["afternoon"] },
  { text: "Afternoon slump? We've got a cure.", timeOfDay: ["afternoon"] },
  { text: "Afternoon, {name}. Traffic can wait.", timeOfDay: ["afternoon"] },
  { text: "Halfway through the day, {name}.", timeOfDay: ["afternoon"] },
  { text: "Someone needs a plot twist.", timeOfDay: ["afternoon"] },
  { text: "Five minutes, one good sentence.", timeOfDay: ["afternoon"] },
  { text: "Afternoon, {name}. What's the mood?", timeOfDay: ["afternoon"] },
  { text: "Good afternoon. The bus isn't here yet.", timeOfDay: ["afternoon"] },
  { text: "Afternoon, {name}. Quick read?", timeOfDay: ["afternoon"] },

  // Evening (5pm–8:59pm)
  { text: "Evening, {name}.", timeOfDay: ["evening"] },
  { text: "Day's done. Story's waiting.", timeOfDay: ["evening"] },
  { text: "Good evening, {name}.", timeOfDay: ["evening"] },
  { text: "Wind down with something short.", timeOfDay: ["evening"] },
  { text: "Evening, {name}. One before bed?", timeOfDay: ["evening"] },
  { text: "Lights low, feed open.", timeOfDay: ["evening"] },
  { text: "What did today deserve, {name}?", timeOfDay: ["evening"] },
  { text: "Good evening. You earned this.", timeOfDay: ["evening"] },
  { text: "Evening, {name}. End the day well.", timeOfDay: ["evening"] },
  { text: "Quiet house, loud story.", timeOfDay: ["evening"] },
  { text: "Dinner's cooking. So is a plot.", timeOfDay: ["evening"] },
  { text: "Evening, {name}. Best part of the day.", timeOfDay: ["evening"] },

  // Night — 9pm–4:59am, the "night owl" bucket
  { text: "Night owl, {name}?", timeOfDay: ["night"] },
  { text: "Still up? Us too.", timeOfDay: ["night"] },
  { text: "It's late. We won't tell.", timeOfDay: ["night"] },
  { text: "Midnight reader spotted.", timeOfDay: ["night"] },
  { text: "Night owl mode: on.", timeOfDay: ["night"] },
  { text: "{name}, it's late. Respect.", timeOfDay: ["night"] },
  { text: "Can't sleep? Neither can we.", timeOfDay: ["night"] },
  { text: "The city's asleep. You're not.", timeOfDay: ["night"] },
  { text: "Late night, {name}. Dangerous stories only.", timeOfDay: ["night"] },
  { text: "3am thoughts need a good story.", timeOfDay: ["night"] },
  { text: "Still awake, {name}? Same.", timeOfDay: ["night"] },
  { text: "One more page won't kill you.", timeOfDay: ["night"] },

  // Any time — witty, punny, brand-flavored, personal
  { text: "Kekere means small. The stories aren't." },
  { text: "Small stories. Big feelings." },
  { text: "Hi, {name}." },
  { text: "Welcome back, {name}." },
  { text: "Good to see you, {name}." },
  { text: "{name}! Just the reader we hoped for." },
  { text: "Ready when you are, {name}." },
  { text: "The feed missed you, {name}." },
  { text: "Plot twist: you opened the app." },
  { text: "{name}, your next favorite story is close." },
  { text: "Story mode: on." },
  { text: "Fiction: gossip that didn't happen." },
  { text: "New here or just nosy? Welcome." },
  { text: "One free story. Basically a free lunch." },
  { text: "Reading's cheaper than therapy." },
  { text: "Let's ruin your schedule, {name}." },
  { text: "Somewhere, a writer's waiting for you." },
  { text: "What are you in the mood for, {name}?" },
  { text: "Hello, {name}. Let's find you a story." },
  { text: "Short on time? So are these stories." },
] as const;

export function getGreetingTimeOfDay(date: Date = new Date()): GreetingTimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** `fullName` is split down to a first name internally — pass the raw
 * User.name, or null for a logged-out visitor / nameless account. */
export function getFeedGreeting(fullName: string | null, date: Date = new Date()): string {
  const firstName = fullName?.trim().split(/\s+/)[0] || null;
  const timeOfDay = getGreetingTimeOfDay(date);

  const pool = GREETINGS.filter((g) => {
    const fitsTime = !g.timeOfDay || g.timeOfDay.includes(timeOfDay);
    const hasNameIfNeeded = firstName || !g.text.includes("{name}");
    return fitsTime && hasNameIfNeeded;
  });

  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return firstName ? chosen.text.replace("{name}", firstName) : chosen.text;
}
