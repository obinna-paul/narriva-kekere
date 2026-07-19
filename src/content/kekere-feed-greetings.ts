/**
 * Rotating greetings for the feed's top-left header — replaces the static
 * "Kekere" wordmark. The feed is a protected route (see middleware.ts), so
 * every visitor here is a logged-in reader with a name on file; there's no
 * logged-out case to design for.
 *
 * These are deliberately NOT brand copy — no mention of Kekere, cowries, or
 * any feature. The whole point is that this spot in the header stops being
 * about the app and starts being about the person looking at their phone
 * right now: a greeting, a joke, a pun, something kind. Puns are welcome.
 * Taglines are not.
 *
 * Picked deterministically (see getFeedGreeting) from a userId + local date
 * + time-of-day seed, not Math.random() — the same reader sees the same
 * line for the next few hours (until the time-of-day bucket below rolls
 * over), then gets a new one, rather than it changing on every reload.
 */

export type GreetingTimeOfDay = "morning" | "afternoon" | "evening" | "night";

interface GreetingTemplate {
  /** May contain "{name}" — replaced with the reader's first name. */
  text: string;
  /** Omitted = fits any time of day. */
  timeOfDay?: readonly GreetingTimeOfDay[];
}

const GREETINGS: readonly GreetingTemplate[] = [
  // ---------------------------------------------------------------------
  // Morning — 5am to 11:59am
  // ---------------------------------------------------------------------
  { text: "Morning, {name}.", timeOfDay: ["morning"] },
  { text: "Rise and read, {name}.", timeOfDay: ["morning"] },
  { text: "Good morning, {name}.", timeOfDay: ["morning"] },
  { text: "Coffee first, story after.", timeOfDay: ["morning"] },
  { text: "Morning, {name}. New chapter, new you.", timeOfDay: ["morning"] },
  { text: "Up early? Bold move.", timeOfDay: ["morning"] },
  { text: "First light, first page.", timeOfDay: ["morning"] },
  { text: "Morning, {name}. What's the plan?", timeOfDay: ["morning"] },
  { text: "Slow start, good story.", timeOfDay: ["morning"] },
  { text: "Sun's up. So is your excuse to read.", timeOfDay: ["morning"] },
  { text: "Morning, {name}. Let's ease into it.", timeOfDay: ["morning"] },
  { text: "Eyes open, world waiting, {name}.", timeOfDay: ["morning"] },
  { text: "Morning, {name}. One page, then reality.", timeOfDay: ["morning"] },
  { text: "The kettle's not the only thing warming up.", timeOfDay: ["morning"] },
  { text: "Morning already, {name}? Respect the hustle.", timeOfDay: ["morning"] },
  { text: "Good morning. Your commute just got interesting.", timeOfDay: ["morning"] },
  { text: "Morning, {name}. Beat the traffic, not the plot.", timeOfDay: ["morning"] },
  { text: "Fresh day, {name}. Slightly used sleep schedule.", timeOfDay: ["morning"] },
  { text: "Morning. Somewhere a rooster agrees with you.", timeOfDay: ["morning"] },
  { text: "Good morning, {name}. Let's not overthink today.", timeOfDay: ["morning"] },
  { text: "Morning, {name}. Breakfast's optional. This isn't.", timeOfDay: ["morning"] },
  { text: "Rise, shine, and mildly panic about the day.", timeOfDay: ["morning"] },
  { text: "Good morning. You survived the alarm. Barely.", timeOfDay: ["morning"] },
  { text: "Morning, {name}. Generator's off, mood isn't.", timeOfDay: ["morning"] },
  { text: "First cup, first line, {name}.", timeOfDay: ["morning"] },
  { text: "{name}, up before your alarm again? Show-off.", timeOfDay: ["morning"] },
  { text: "Morning. Today hasn't disappointed you yet.", timeOfDay: ["morning"] },
  { text: "{name}, the day owes you a good first hour.", timeOfDay: ["morning"] },
  { text: "Good morning. Bar for the day: low. Achievable.", timeOfDay: ["morning"] },
  { text: "Morning, {name}. Let's pretend we have a plan.", timeOfDay: ["morning"] },

  // ---------------------------------------------------------------------
  // Afternoon — 12pm to 4:59pm
  // ---------------------------------------------------------------------
  { text: "Afternoon, {name}.", timeOfDay: ["afternoon"] },
  { text: "Taking five, {name}?", timeOfDay: ["afternoon"] },
  { text: "Good afternoon.", timeOfDay: ["afternoon"] },
  { text: "Lunch break reading?", timeOfDay: ["afternoon"] },
  { text: "Afternoon slump? We've got a cure.", timeOfDay: ["afternoon"] },
  { text: "Afternoon, {name}. That meeting could've been an email.", timeOfDay: ["afternoon"] },
  { text: "Halfway through the day, {name}.", timeOfDay: ["afternoon"] },
  { text: "Someone needs a plot twist.", timeOfDay: ["afternoon"] },
  { text: "Five minutes, one good sentence.", timeOfDay: ["afternoon"] },
  { text: "Afternoon, {name}. What's the mood?", timeOfDay: ["afternoon"] },
  { text: "The bus isn't here yet, is it, {name}?", timeOfDay: ["afternoon"] },
  { text: "Afternoon, {name}. Deep breath, quick read.", timeOfDay: ["afternoon"] },
  { text: "3pm and already tired? Same.", timeOfDay: ["afternoon"] },
  { text: "Afternoon, {name}. Officially past the hard part.", timeOfDay: ["afternoon"] },
  { text: "Good afternoon. Everyone's pretending to work.", timeOfDay: ["afternoon"] },
  { text: "Afternoon, {name}. NEPA took the light, not the plot.", timeOfDay: ["afternoon"] },
  { text: "Lunch is done. The suspense isn't.", timeOfDay: ["afternoon"] },
  { text: "Afternoon, {name}. Halfway to freedom.", timeOfDay: ["afternoon"] },
  { text: "Good afternoon. You've earned a small escape.", timeOfDay: ["afternoon"] },
  { text: "Afternoon, {name}. Stretch, then read.", timeOfDay: ["afternoon"] },
  { text: "The email can wait five more minutes, {name}.", timeOfDay: ["afternoon"] },
  { text: "Afternoon, {name}. Second wind, or first nap?", timeOfDay: ["afternoon"] },
  { text: "Good afternoon. Somewhere, a kettle just clicked off.", timeOfDay: ["afternoon"] },
  { text: "Afternoon, {name}. This is your intermission.", timeOfDay: ["afternoon"] },
  { text: "Two more hours, {name}. You've got this.", timeOfDay: ["afternoon"] },
  { text: "{name}, the afternoon is testing your patience.", timeOfDay: ["afternoon"] },
  { text: "Afternoon. Somehow it's still today.", timeOfDay: ["afternoon"] },
  { text: "{name}, the productive part of the day is over.", timeOfDay: ["afternoon"] },
  { text: "Good afternoon. Coffee number two, {name}?", timeOfDay: ["afternoon"] },
  { text: "Afternoon, {name}. Hold on, we're almost there.", timeOfDay: ["afternoon"] },

  // ---------------------------------------------------------------------
  // Evening — 5pm to 8:59pm
  // ---------------------------------------------------------------------
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
  { text: "Good evening. Shoes off, guard down.", timeOfDay: ["evening"] },
  { text: "Evening, {name}. Today's over. Mostly good, right?", timeOfDay: ["evening"] },
  { text: "The generator hums, the story waits.", timeOfDay: ["evening"] },
  { text: "Evening, {name}. You made it. That counts.", timeOfDay: ["evening"] },
  { text: "Good evening. Slippers on, drama begins.", timeOfDay: ["evening"] },
  { text: "Evening, {name}. Traffic's gone, tension isn't.", timeOfDay: ["evening"] },
  { text: "Somewhere between dinner and bed, {name}.", timeOfDay: ["evening"] },
  { text: "Good evening. This is the good part of the day.", timeOfDay: ["evening"] },
  { text: "Evening, {name}. Phone down, book up.", timeOfDay: ["evening"] },
  { text: "The day's over. Let something else begin.", timeOfDay: ["evening"] },
  { text: "Evening, {name}. You've done enough today.", timeOfDay: ["evening"] },
  { text: "Good evening. Time to be someone else for a bit.", timeOfDay: ["evening"] },
  { text: "Evening, {name}. Rest first, world later.", timeOfDay: ["evening"] },
  { text: "{name}, the day's winding down. So can you.", timeOfDay: ["evening"] },
  { text: "Evening. Whatever today was, it's nearly over.", timeOfDay: ["evening"] },
  { text: "{name}, you get to choose the next hour now.", timeOfDay: ["evening"] },
  { text: "Good evening. Nobody's asking anything of you here.", timeOfDay: ["evening"] },
  { text: "Evening, {name}. The good kind of tired begins now.", timeOfDay: ["evening"] },

  // ---------------------------------------------------------------------
  // Night — 9pm to 4:59am
  // ---------------------------------------------------------------------
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
  { text: "Sleep is for people without a good story going.", timeOfDay: ["night"] },
  { text: "{name}, the neighbours are asleep. You're winning.", timeOfDay: ["night"] },
  { text: "Late night. No judgment here.", timeOfDay: ["night"] },
  { text: "Insomnia's better with company.", timeOfDay: ["night"] },
  { text: "{name}, tomorrow-you is going to be tired. Worth it?", timeOfDay: ["night"] },
  { text: "The moon's up. So are you. Fair enough.", timeOfDay: ["night"] },
  { text: "Night owl, {name}. We don't ask why.", timeOfDay: ["night"] },
  { text: "It's dark outside. Bright idea, staying up.", timeOfDay: ["night"] },
  { text: "Somewhere it's morning. Here, it's this.", timeOfDay: ["night"] },
  { text: "{name}, one story won't cost you tomorrow. Two might.", timeOfDay: ["night"] },
  { text: "The house is quiet. You clearly aren't tired.", timeOfDay: ["night"] },
  { text: "Late night reading hits different, {name}.", timeOfDay: ["night"] },
  { text: "Still here at this hour? Bold. Respect it.", timeOfDay: ["night"] },
  { text: "{name}, this is technically tomorrow already.", timeOfDay: ["night"] },
  { text: "Everyone else gave up on today. Not you.", timeOfDay: ["night"] },
  { text: "{name}, at this point, might as well finish it.", timeOfDay: ["night"] },
  { text: "The quiet hours are the best ones, {name}.", timeOfDay: ["night"] },
  { text: "Night owl confirmed, {name}. Again.", timeOfDay: ["night"] },

  // ---------------------------------------------------------------------
  // Any time — puns, warmth, dry humor, nothing product-related
  // ---------------------------------------------------------------------
  { text: "Hi, {name}." },
  { text: "Welcome back, {name}." },
  { text: "Good to see you, {name}." },
  { text: "{name}! Just the reader we hoped for." },
  { text: "Ready when you are, {name}." },
  { text: "We missed you, {name}." },
  { text: "Plot twist: you're here again." },
  { text: "Story mode: on." },
  { text: "Fiction: gossip that didn't happen." },
  { text: "What are you in the mood for, {name}?" },
  { text: "Hello, {name}. Let's find you a story." },
  { text: "Short on time, {name}? Same." },
  { text: "{name}, no small talk. Straight to the plot." },
  { text: "Well, well, well. Look who's back." },
  { text: "{name}, right on schedule. Suspiciously." },
  { text: "Reading's cheaper than therapy, honestly." },
  { text: "{name}, you and I both know why you're here." },
  { text: "Blink and you'll miss the good part." },
  { text: "{name}, the suspense missed you specifically." },
  { text: "One page in and already invested. Classic." },
  { text: "{name}, procrastination has never looked this good." },
  { text: "Somewhere, a character's about to make a bad call." },
  { text: "{name}, the drama starts whenever you're ready." },
  { text: "You again? We like that." },
  { text: "{name}, low commitment, high payoff." },
  { text: "{name}, your attention span called. It's fine, actually." },
  { text: "Whatever you're avoiding, this is a better use of time." },
  { text: "{name}, a stranger wrote this for this exact moment." },
  { text: "This is the productive kind of distraction, {name}." },
  { text: "Somebody's about to make questionable choices. Not you." },
  { text: "{name}, five minutes. That's the whole ask." },
  { text: "Consider this your permission slip, {name}." },
  { text: "New page, new problems, {name}." },
  { text: "{name}, you clicked. Commitment issues: none today." },
  { text: "Somewhere a writer is nervous about this exact moment." },
  { text: "{name}, whatever's stressing you out can wait a bit." },
  { text: "Not all heroes wear capes. Some just finish chapters." },
  { text: "{name}, the cliffhanger from last time is still waiting." },
  { text: "Your to-do list will keep. This won't take long." },
  { text: "{name}, we kept the good stuff for you." },
  { text: "A secret just got out somewhere. Want in, {name}?" },
  { text: "{name}, low effort, high reward. Can't complain." },
  { text: "Might not fix today. Five minutes will help." },
  { text: "{name}, a little escapism never hurt anyone. Mostly." },
  { text: "You made time. That's rarer than people think, {name}." },
  { text: "{name}, let's see what today's got." },
  { text: "Two minutes in, you'll forget everything else." },
  { text: "{name}, back for more? Bold and correct." },
  { text: "Somewhere, a plot is unraveling on schedule." },
  { text: "{name}, the door's open. Bad time choices await." },
  { text: "You blinked and ended up here again. Fate, probably." },
  { text: "{name}, we won't ask what you're supposed to be doing." },
  { text: "A little chaos, a little comfort — pick one, {name}." },
  { text: "{name}, nobody's watching. Read whatever you want." },
  { text: "This is your five minutes. Guard them, {name}." },
  { text: "{name}, the algorithm knows nothing. We're guessing too." },
  { text: "Someone's about to mess up. Not you, {name}." },
  { text: "{name}, let's find out what happens next." },
  { text: "You came back. That's the whole plot twist, {name}." },
  { text: "{name}, a story is a very small, very good decision." },
  { text: "Everyone deserves a good sentence today, {name}." },
] as const;

export function getGreetingTimeOfDay(date: Date = new Date()): GreetingTimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** Deliberately unfussy — this only needs to be deterministic, not
 * cryptographically sound, so the same (userId, day, time-of-day) always
 * lands on the same index without persisting anything. */
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

/**
 * Deterministic, not random: the same reader gets the same greeting for as
 * long as the local time-of-day bucket holds (a few hours), then a new one
 * once it rolls over — rather than a fresh pick on every reload.
 */
export function getFeedGreeting(userId: string, fullName: string, date: Date = new Date()): string {
  const firstName = fullName.trim().split(/\s+/)[0] || "";
  const timeOfDay = getGreetingTimeOfDay(date);

  const pool = GREETINGS.filter((g) => {
    const fitsTime = !g.timeOfDay || g.timeOfDay.includes(timeOfDay);
    const hasNameIfNeeded = firstName || !g.text.includes("{name}");
    return fitsTime && hasNameIfNeeded;
  });

  const seed = hashString(`${userId}|${localDateKey(date)}|${timeOfDay}`);
  const chosen = pool[seed % pool.length];
  return firstName ? chosen.text.replace("{name}", firstName) : chosen.text;
}
