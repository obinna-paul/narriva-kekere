/**
 * Static mock data for the Narriva site (homepage, bookstore, author pages).
 * Replaced by real queries against the Prisma `Book` / `User` tables in
 * Phase 7 — keep shapes here close to the schema so that swap is mechanical,
 * not a rewrite.
 */

export interface MockEditorNote {
  text: string;
  editor: string;
}

export interface MockBook {
  id: string;
  slug: string;
  title: string;
  authorSlug: string;
  author: string;
  genre: string;
  isNewRelease: boolean;
  hookLine: string;
  synopsis: string;
  excerpt: readonly string[];
  priceNgn: number;
  coverColor: string;
  ebookRef: string;
  chapterCount: number;
  wordCount: number;
  estimatedReadTime: number;
  editorNote: MockEditorNote;
}



export const MOCK_BOOKS: readonly MockBook[] = [
  {
    id: "the-quiet-half",
    slug: "the-quiet-half",
    title: "The Quiet Half",
    authorSlug: "ngozi-adeyemi",
    author: "Ngozi Adeyemi",
    genre: "Literary Fiction",
    isNewRelease: false,
    hookLine: "A marriage told from the half nobody asks about.",
    synopsis:
      "Everyone in the building knows the Okafors as the couple who never raise their voices. What they don't know is the arithmetic Adaeze has been doing for eleven years — what she gave up, what she's owed, and what's left if she finally stops paying. Told in the quiet, devastating register of a woman doing the sums in private, The Quiet Half is a novel about the half of a marriage that doesn't get to narrate itself, until now.",
    excerpt: [
      "Adaeze had learned, over eleven years, that the trick to a long marriage was never to ask the question you actually wanted answered. You asked the smaller one. Did you eat. Did you lock the gate. Is the generator off. The big question sat behind all of them, patient as furniture, and she had gotten so good at not asking it that some nights she forgot it was there at all.",
      "Tonight it was there. He came in past ten, smelling of someone else's perfume and his own apology, and she watched him take off his shoes in the dark like a man who had rehearsed it.",
      "\"You ate?\" she said, because eleven years had taught her exactly where to start.",
    ],
    priceNgn: 8500,
    coverColor: "#1E3A8A",
    ebookRef: "books/the-quiet-half/content.json",
    chapterCount: 18,
    wordCount: 62400,
    estimatedReadTime: 208,
    editorNote: {
      text: "I read this manuscript in a single sitting and then read the last forty pages again immediately. Ngozi writes the unsaid better than anyone we've published — this is a book about silence that never once goes quiet.",
      editor: "Funke Adisa, Editorial Director",
    },
  },
  {
    id: "the-currency-of-small-lies",
    slug: "the-currency-of-small-lies",
    title: "The Currency of Small Lies",
    authorSlug: "ngozi-adeyemi",
    author: "Ngozi Adeyemi",
    genre: "Thriller",
    isNewRelease: false,
    hookLine: "Every family keeps a ledger. Hers just has a body in it.",
    synopsis:
      "When her brother-in-law disappears two weeks before a contested inheritance hearing, Bisi Okafor is the only one in the family who notices the lies are starting to overlap. A tense, slow-burn thriller about the small dishonesties that hold a wealthy Lagos family together — and the one that finally breaks it apart.",
    excerpt: [
      "The first lie was small enough to forgive: that the car had been at the mechanic's, not at the house on Kofo Abayomi. Bisi let it go because everyone's marriage had a car like that somewhere.",
      "The second lie was about money, and money was never really about money in this family — it was about who got to keep pretending they hadn't noticed.",
      "By the third lie she had started keeping a list, and a woman who keeps a list eventually has to do something with it.",
    ],
    priceNgn: 7600,
    coverColor: "#7C2D12",
    ebookRef: "books/the-currency-of-small-lies/content.json",
    chapterCount: 22,
    wordCount: 71200,
    estimatedReadTime: 237,
    editorNote: {
      text: "Ngozi's first thriller, and it shows none of the seams you'd expect from a literary novelist crossing genres. The plotting is ruthless; the family at the center of it is the real horror.",
      editor: "Funke Adisa, Editorial Director",
    },
  },
  {
    id: "lagos-after-dark",
    slug: "lagos-after-dark",
    title: "Lagos After Dark",
    authorSlug: "tunde-bakare",
    author: "Tunde Bakare",
    genre: "Thriller",
    isNewRelease: true,
    hookLine: "Six strangers, one generator, the longest blackout of the year.",
    synopsis:
      "When a city-wide blackout strands six strangers in a Victoria Island apartment block, the dark turns out to be the least of their problems — one of them is hiding something worth killing for. A tight, single-location thriller that runs in real time over one airless Lagos night.",
    excerpt: [
      "The lights went at 9:47, which everyone would later agree was the worst possible time, though no one could say why a blackout had a worse and better time to begin with.",
      "On the fourth floor, six people who had spent eight months pretending not to know each other's names were suddenly very interested in learning them.",
      "Someone had a generator. Someone else had a reason not to want it switched on.",
    ],
    priceNgn: 7200,
    coverColor: "#B08D57",
    ebookRef: "books/lagos-after-dark/content.json",
    chapterCount: 16,
    wordCount: 55300,
    estimatedReadTime: 184,
    editorNote: {
      text: "Tunde sent us the first fifty pages and a one-line pitch: 'a thriller that never leaves the building.' We bought it before he finished the rest. It's the tightest plot we've published this year.",
      editor: "Wale Ogundipe, Senior Editor",
    },
  },
  {
    id: "the-cartographer-of-small-things",
    slug: "the-cartographer-of-small-things",
    title: "The Cartographer of Small Things",
    authorSlug: "funmilayo-okechukwu",
    author: "Funmilayo Okechukwu",
    genre: "Literary Fiction",
    isNewRelease: false,
    hookLine: "A woman maps her grandmother's house room by disappearing room.",
    synopsis:
      "After her grandmother's death, Chiamaka inherits a house that is, room by room, being reclaimed by the family that never forgave her for leaving. A slow, interior novel about inheritance, memory, and the rooms we map only after we've lost the right to stay in them.",
    excerpt: [
      "The house had eleven rooms when her grandmother died, and Chiamaka knew this because she had counted them on the drive in, the way you count anything when you are afraid of what's waiting at the end of the road.",
      "By the time the will was read, it had nine. Her uncles had a way of absorbing a room without ever discussing it.",
    ],
    priceNgn: 9000,
    coverColor: "#2541B2",
    ebookRef: "books/the-cartographer-of-small-things/content.json",
    chapterCount: 14,
    wordCount: 51300,
    estimatedReadTime: 171,
    editorNote: {
      text: "Funmilayo writes interiors — both the architectural kind and the emotional kind — better than anyone on our list. This book asks you to slow down, and it rewards you completely for doing it.",
      editor: "Funke Adisa, Editorial Director",
    },
  },
  {
    id: "lectures-to-no-one",
    slug: "lectures-to-no-one",
    title: "Lectures to No One",
    authorSlug: "funmilayo-okechukwu",
    author: "Funmilayo Okechukwu",
    genre: "Poetry",
    isNewRelease: true,
    hookLine: "A collection for everyone who has ever rehearsed an argument they never had.",
    synopsis:
      "Forty poems addressed to people who will never read them — an absent father, a city that's changed its name twice, a younger self who didn't know yet what she'd give up. Funmilayo's first poetry collection is as precise and devastating as her fiction.",
    excerpt: [
      "I have given this speech to the bathroom mirror,\nto the inside of the car, to you,\nspecifically to you, asleep,\nwhich is the only way you've ever really listened.",
      "Here is what I would say if the lights were on\nand you were still the kind of man\nwho stayed for the end of a sentence.",
    ],
    priceNgn: 5200,
    coverColor: "#6D28D9",
    ebookRef: "books/lectures-to-no-one/content.json",
    chapterCount: 40,
    wordCount: 28900,
    estimatedReadTime: 96,
    editorNote: {
      text: "We don't publish much poetry, which is exactly why we said yes to this. Funmilayo's lines do in six words what her novels take six pages to do, and just as well.",
      editor: "Wale Ogundipe, Senior Editor",
    },
  },
  {
    id: "salt-and-harmattan",
    slug: "salt-and-harmattan",
    title: "Salt and Harmattan",
    authorSlug: "ifeoma-chukwu",
    author: "Ifeoma Chukwu",
    genre: "Literary Fiction",
    isNewRelease: false,
    hookLine: "A fishing town's last good season, narrated by the sea.",
    synopsis:
      "Before the harbour closed, before the young people left for the mainland, there was one last good season — and the sea, in its own patient voice, remembers all of it. A coastal elegy for a town that doesn't exist anymore, except in the telling.",
    excerpt: [
      "I have kept towns before. I keep this one differently, because I was there for the part where it ended and most of them weren't.",
      "They will tell you the harbour closed because of the new port at Onne. That is true the way a single wave is true — it is the right size, but it is not the whole story.",
    ],
    priceNgn: 7800,
    coverColor: "#161616",
    ebookRef: "books/salt-and-harmattan/content.json",
    chapterCount: 20,
    wordCount: 79800,
    estimatedReadTime: 266,
    editorNote: {
      text: "Ifeoma writes the sea as a character with more interiority than most people manage to give their narrators. This is a quiet book that will not leave you alone.",
      editor: "Funke Adisa, Editorial Director",
    },
  },
  {
    id: "what-the-river-kept",
    slug: "what-the-river-kept",
    title: "What the River Kept",
    authorSlug: "ifeoma-chukwu",
    author: "Ifeoma Chukwu",
    genre: "Literary Fiction",
    isNewRelease: true,
    hookLine: "Three sisters return home to bury a secret the river won't.",
    synopsis:
      "Twenty years after they left, three sisters return to their childhood home on the same week the river floods for the first time since their mother disappeared in it. What the water gives back is not what any of them expected.",
    excerpt: [
      "The river had taken their mother and given back, over twenty years, almost nothing: a sandal, once, three years on. A name carved into a tree that the current had somehow not erased.",
      "Now it was giving back something else, and all three sisters had driven through the night to be the one standing there when it did.",
    ],
    priceNgn: 8200,
    coverColor: "#0F766E",
    ebookRef: "books/what-the-river-kept/content.json",
    chapterCount: 24,
    wordCount: 89700,
    estimatedReadTime: 299,
    editorNote: {
      text: "This is Ifeoma at her most ambitious — three points of view, one river, and a secret she makes you wait the entire book to earn. Worth every page of the wait.",
      editor: "Wale Ogundipe, Senior Editor",
    },
  },
  {
    id: "harvest-of-quiet-years",
    slug: "harvest-of-quiet-years",
    title: "Harvest of Quiet Years",
    authorSlug: "ifeoma-chukwu",
    author: "Ifeoma Chukwu",
    genre: "Memoir",
    isNewRelease: true,
    hookLine: "A memoir about the years nothing happened, and why they mattered most.",
    synopsis:
      "Ifeoma Chukwu's first memoir turns away from the dramatic years of her life and toward the quiet ones — the long stretch between leaving home and becoming a writer, when nothing seemed to be happening at all. A tender, funny, unsentimental account of an ordinary decade.",
    excerpt: [
      "Nobody writes a memoir about the years they spent commuting, paying rent, and waiting for something to happen. I understand why. I am asking you to read one anyway.",
      "The drama, when it finally came, was almost a disappointment. The quiet years had already taught me everything.",
    ],
    priceNgn: 6800,
    coverColor: "#92400E",
    ebookRef: "books/harvest-of-quiet-years/content.json",
    chapterCount: 12,
    wordCount: 45100,
    estimatedReadTime: 150,
    editorNote: {
      text: "Memoirs about quiet years are a hard sell and an even harder write. Ifeoma makes the case, page after page, that the quiet years were the real story all along.",
      editor: "Funke Adisa, Editorial Director",
    },
  },
  {
    id: "the-understudy",
    slug: "the-understudy",
    title: "The Understudy",
    authorSlug: "tunde-bakare",
    author: "Tunde Bakare",
    genre: "Drama",
    isNewRelease: false,
    hookLine: "He's played the lead in every life but his own.",
    synopsis:
      "For fifteen years, Emeka has understudied the same leading man on the same Lagos stage, ready every night to become someone else's career. When the lead finally falls ill on opening night of the role of a lifetime, Emeka gets one performance to find out what was actually his all along.",
    excerpt: [
      "He had been ready for this exact night for fifteen years, which was either the best preparation an actor could ask for or proof that nothing in his own life had ever been quite ready to start.",
      "The stage manager said the word 'go' the way you'd say it to someone falling, not someone flying, and Emeka understood, walking out, that both might be true at once.",
    ],
    priceNgn: 6900,
    coverColor: "#1F2937",
    ebookRef: "books/the-understudy/content.json",
    chapterCount: 15,
    wordCount: 53700,
    estimatedReadTime: 179,
    editorNote: {
      text: "Tunde usually writes thrillers, but he understands suspense as a structure, not a genre — and a man waiting fifteen years for one night turns out to be just as tense as a blackout full of strangers.",
      editor: "Wale Ogundipe, Senior Editor",
    },
  },
] as const;

export interface MockAuthor {
  slug: string;
  name: string;
  description: string;
  bio: readonly string[];
  avatarColor: string;
  socialLinks?: readonly { label: string; href: string }[];
}

export const MOCK_AUTHORS: readonly MockAuthor[] = [
  {
    slug: "ngozi-adeyemi",
    name: "Ngozi Adeyemi",
    description: "Writes literary fiction about Lagos's middle class.",
    bio: [
      "Ngozi Adeyemi was born and raised in Surulere and spent a decade in corporate law before leaving to write full time — a decision she has described as 'the only good argument I've ever lost with myself.'",
      "Her work focuses on the domestic compromises of Lagos's professional class: the marriages, inheritances, and small dishonesties that hold a comfortable life together. The Quiet Half was her debut; The Currency of Small Lies is her first thriller.",
    ],
    avatarColor: "#1E3A8A",
    socialLinks: [{ label: "Personal site", href: "#" }],
  },
  {
    slug: "tunde-bakare",
    name: "Tunde Bakare",
    description: "Crime and suspense set in cities that never quite sleep.",
    bio: [
      "Tunde Bakare started out writing radio drama before moving to the page, and it shows — his novels are built on dialogue and confined spaces, the kind of suspense you could stage as easily as publish.",
      "He lives in Lagos, where most of his books are also set, and maintains that the city has never once needed help inventing tension.",
    ],
    avatarColor: "#B08D57",
  },
  {
    slug: "funmilayo-okechukwu",
    name: "Funmilayo Okechukwu",
    description: "Quiet, interior novels about memory and inheritance.",
    bio: [
      "Funmilayo Okechukwu writes slow, interior fiction about houses, inheritance, and the rooms families lose without ever discussing it. Lectures to No One, her first poetry collection, grew out of marginalia she never intended to publish.",
      "She teaches a short-fiction workshop in Enugu twice a year and reads almost exclusively in translation.",
    ],
    avatarColor: "#2541B2",
    socialLinks: [
      { label: "Instagram", href: "#" },
      { label: "Personal site", href: "#" },
    ],
  },
  {
    slug: "ifeoma-chukwu",
    name: "Ifeoma Chukwu",
    description: "Coastal communities, told with an ear for dialect.",
    bio: [
      "Ifeoma Chukwu grew up between Bonny and Port Harcourt and writes almost exclusively about the coast — its towns, its dialects, and the things the water keeps or gives back.",
      "Harvest of Quiet Years, her first memoir, was written during the same year she finished What the River Kept, which she has called 'the strangest writing year of my life, and the most honest.'",
    ],
    avatarColor: "#161616",
  },
] as const;

// Blog post mock data lives in src/content/mock/narriva-blog.ts.
