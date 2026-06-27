export interface CategoryRow {
  name: string;
  /** Optional genre filter for this specific row (overrides parent genre). */
  genre?: string;
  /** "freeOnly" — only show free stories. */
  freeOnly?: boolean;
}

export interface GenreConfig {
  label: string;
  rows: CategoryRow[];
}

export const FEED_GENRES: GenreConfig[] = [
  {
    label: "General Fiction",
    rows: [
      { name: "Tales so good you'll miss your bus stop" },
      { name: "Short enough for a lunch break, long enough to stay with you" },
      { name: "No cowries needed — dive right in", freeOnly: true },
      { name: "The kind of stories you text your best friend about" },
    ],
  },
  {
    label: "Romance",
    rows: [
      { name: "Love stories that'll make your heart do backflips" },
      { name: "For when you need to believe in love again — in under 10 minutes" },
      { name: "Meet-cutes, missed connections, and midnight confessions" },
      { name: "Free love stories (the only kind that don't cost cowries)", freeOnly: true },
    ],
  },
  {
    label: "Thriller",
    rows: [
      { name: "You'll never guess who did it (seriously, you won't)" },
      { name: "Stories with more twists than a Lagos roundabout" },
      { name: "Read with the lights on. We warned you." },
      { name: "Pulse-racing, palm-sweating, absolutely-free thrillers", freeOnly: true },
    ],
  },
  {
    label: "Speculative Fiction",
    rows: [
      { name: "Lagos in 2086, and other futures you haven't imagined yet" },
      { name: "What if the ancestors had Wi-Fi?" },
      { name: "The Mami Wata Cinematic Universe" },
      { name: "Worlds so real you'll forget this one", freeOnly: true },
    ],
  },
  {
    label: "Horror",
    rows: [
      { name: "Don't read these alone after dark" },
      { name: "Stories that'll make you check under your bed" },
      { name: "Your neighbour's secret is worse than you think" },
      { name: "Haunted houses, cursed objects, and that one creepy street", freeOnly: true },
    ],
  },
  {
    label: "Drama",
    rows: [
      { name: "Family secrets served hot with a side of jollof" },
      { name: "Weddings, funerals, and the chaos in between" },
      { name: "Stories about the things we don't say at dinner" },
      { name: "Drama so real it feels like eavesdropping", freeOnly: true },
    ],
  },
  {
    label: "Comedy",
    rows: [
      { name: "Stories that'll make you laugh out loud on public transport" },
      { name: "Nigerian aunties, WhatsApp group wars, and other national treasures" },
      { name: "When life gives you lemons, write a story about the lemon seller" },
      { name: "Free laughs — the best kind of therapy", freeOnly: true },
    ],
  },
  {
    label: "Erotica",
    rows: [
      { name: "Stories to read with one eye open" },
      { name: "Slow burns, fast nights, and everything in between" },
      { name: "Desire in the time of generator fumes" },
      { name: "Steamy, sensual, and absolutely free", freeOnly: true },
    ],
  },
  {
    label: "Lagos",
    rows: [
      { name: "Literally anything can happen in Lagos" },
      { name: "Danfo philosophy and Third Mainland Bridge confessions" },
      { name: "The city that never sleeps — and the people who can't afford to" },
      { name: "Free Lagos stories: no cowries, just vibes", freeOnly: true },
    ],
  },
  {
    label: "Crime",
    rows: [
      { name: "Perfect crimes, imperfect criminals" },
      { name: "Heists, hustles, and the Lagos underworld" },
      { name: "Everyone's innocent until the last paragraph" },
      { name: "Free crime stories that steal nothing but your attention", freeOnly: true },
    ],
  },
  {
    label: "Historical Fiction",
    rows: [
      { name: "Stories your grandmother would recognise" },
      { name: "Before independence, after dinner — Africa's untold decades" },
      { name: "Cowries, colonialism, and the lives between the history books" },
      { name: "The past, beautifully imagined — and free", freeOnly: true },
    ],
  },
];
