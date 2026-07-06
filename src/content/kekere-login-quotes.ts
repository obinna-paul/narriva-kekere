/**
 * Rotating taglines for the Kekere login/signup hero. One is picked at
 * random per page load (see src/app/login/page.tsx) so returning visitors
 * see something different each time instead of the same fixed line.
 */
export const KEKERE_LOGIN_QUOTES: readonly string[] = [
  // Reading-lifestyle, in the spirit of the original line
  "Read in the time it takes to wait for a bus.",
  "Long enough to matter, short enough to finish before your food gets cold.",
  "A whole world before your data bundle runs out.",
  "Shorter than the queue at the bank. Better than the wait.",
  "Start on the bike, finish before the next stop.",
  "One story, one traffic jam. Choose the story.",
  "Finish it before NEPA takes the light.",
  "Short enough for a lunch break, good enough to ruin your whole day.",
  "The kind of story you can finish before your battery starts worrying you.",
  "Perfect for the length of a bad Nollywood ad break.",

  // Funny one-liners
  "Not every hero wears a cape. Some just finish their manuscripts.",
  "Warning: may cause you to miss your bus stop.",
  "Written by humans. Occasionally edited by caffeine.",
  "If you finish this in one sitting, congratulations — you have a functioning attention span.",
  "Reading: the original doom-scrolling.",
  "This app was built by people who also stayed up till 2am for 'just one more chapter.'",
  "We promise these stories are shorter than your ex's paragraph texts.",
  "Some people collect stamps. We collect endings that hit different.",
  "No plot twist here — just the honest truth that short stories slap.",
  "Five minutes well spent. Unlike most meetings.",

  // Smart brand copy
  "Small stories. Big feelings.",
  "Kekere means small. The stories don't stay that way.",
  "Every stall has a spirit. Every writer has a story.",
  "Good fiction doesn't need 400 pages to break your heart.",
  "We publish stories, not doorstops.",
  "The best plot twists happen in fewer words than you'd think.",
  "Some stories take a lifetime to write and five minutes to read. That's the magic.",
  "African stories. No passport required.",
  "A library that fits in your pocket and your commute.",
  "Real writers. Real readers. Real cowries.",
  "This is the shortest commitment you'll make all week.",
  "Written in Lagos, Accra, Nairobi, and everywhere in between.",
  "The bus will come. The story will end first.",
  "Great fiction has no size requirement. Neither do great writers.",
  "Somewhere, a writer just got a cowrie richer because you read this.",
  "New voices. Old truths. Short reads.",
  "We built this for the in-between moments — because that's most of life.",

  // Unpopular opinions about the literary world
  "Unpopular opinion: the short story is harder to write than the novel. Fight us.",
  "Unpopular opinion: most plot twists are just poor pacing wearing a costume.",
  "Unpopular opinion: nobody actually finished that 900-page fantasy series. We see you.",
  "Unpopular opinion: a good ending is worth more than a slow beginning.",
  "Unpopular opinion: writer's block is just your brain asking for a nap.",
  "Unpopular opinion: the sequel is rarely better. We said what we said.",
  "Unpopular opinion: not every story needs a moral. Some just need an ending.",
  "Unpopular opinion: a great first line matters more than a great cover.",
  "Unpopular opinion: audiobooks count. Fight us again.",
  "Unpopular opinion: the footnotes were never necessary.",
] as const;

export function getRandomKekereLoginQuote(): string {
  return KEKERE_LOGIN_QUOTES[Math.floor(Math.random() * KEKERE_LOGIN_QUOTES.length)];
}
