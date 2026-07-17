export interface StoryTag {
  slug: string;
  label: string;
  /** Catchy section heading shown on the feed row for this tag */
  feedHeading: string;
  /** Short descriptor shown in dropdowns / tag pills */
  description: string;
}

/**
 * The canonical, system-registered tag list.
 * Admin cannot create new tags — they must pick from this list.
 * Tags are backend-only; readers never see the raw slug.
 */
export const STORY_TAGS: readonly StoryTag[] = [
  // Tone / mood
  { slug: "funny",           label: "Funny",           feedHeading: "Fancy a laugh?",                         description: "Comedic, witty, or humorous" },
  { slug: "dark",            label: "Dark",             feedHeading: "Not every story gets a happy ending",    description: "Bleak, unsettling, or morally heavy" },
  { slug: "creepy",          label: "Creepy",           feedHeading: "Read alone at night. We dare you",       description: "Eerie, disturbing, or horror-adjacent" },
  { slug: "heartwarming",    label: "Heartwarming",     feedHeading: "Stories that hug you back",              description: "Feel-good, uplifting, or affirming" },
  { slug: "tense",           label: "Tense",            feedHeading: "Your heart rate is about to change",     description: "High-stakes, nail-biting suspense" },
  { slug: "melancholy",      label: "Melancholy",       feedHeading: "The ache that doesn't want fixing",      description: "Bittersweet or quietly sorrowful" },
  { slug: "rage",            label: "Rage",             feedHeading: "This will make your blood boil, on purpose", description: "Anger, injustice, or burning frustration" },
  { slug: "poetic",          label: "Poetic",           feedHeading: "Words that sing",                        description: "Lyrical, metaphor-rich prose" },
  { slug: "absurdist",       label: "Absurdist",        feedHeading: "Nothing makes sense. That's the point.", description: "Surreal or intentionally illogical" },

  // Themes / subject matter
  { slug: "romance",         label: "Romance",          feedHeading: "Fall for someone who isn't real (yet)", description: "Love, desire, or romantic tension" },
  { slug: "erotic",          label: "Erotic",           feedHeading: "18+ — proceed knowingly",               description: "Explicit adult content" },
  { slug: "grief",           label: "Grief",            feedHeading: "For the goodbyes that never felt finished", description: "Death, mourning, or processing pain" },
  { slug: "heartbreak",      label: "Heartbreak",       feedHeading: "They never really got over it",         description: "Romantic loss or emotional devastation" },
  { slug: "revenge",         label: "Revenge",          feedHeading: "Served cold. Very cold.",               description: "Retribution, score-settling, or payback" },
  { slug: "survival",        label: "Survival",         feedHeading: "They made it. Barely.",                 description: "Endurance against the odds" },
  { slug: "identity",        label: "Identity",         feedHeading: "Who are you, really?",                  description: "Self-discovery, belonging, or reinvention" },
  { slug: "trauma",          label: "Trauma",           feedHeading: "The parts they don't usually tell you",  description: "Processing pain, abuse, or difficult pasts" },
  { slug: "family",          label: "Family",           feedHeading: "Blood, chosen and otherwise",           description: "Parents, siblings, or found family" },
  { slug: "friendship",      label: "Friendship",       feedHeading: "Ride or die",                           description: "Platonic bonds, loyalty, or betrayal" },
  { slug: "betrayal",        label: "Betrayal",         feedHeading: "The knife you didn't see coming",       description: "Broken trust or shocking disloyalty" },
  { slug: "ambition",        label: "Ambition",         feedHeading: "Hungry for more",                       description: "Striving, hustle, or the price of success" },
  { slug: "power",           label: "Power",            feedHeading: "Who's really in charge?",               description: "Control, influence, or corruption" },
  { slug: "religion",        label: "Religion",         feedHeading: "Faith, doubt, and everything between",  description: "Spiritual belief, practice, or crisis" },
  { slug: "money",           label: "Money",            feedHeading: "Follow the money",                      description: "Wealth, poverty, or the lure of cash" },
  { slug: "politics",        label: "Politics",         feedHeading: "Power plays and dirty hands",           description: "Government, activism, or systemic issues" },
  { slug: "justice",         label: "Justice",          feedHeading: "Somebody has to answer for this",       description: "Law, fairness, or moral reckoning" },
  { slug: "class",           label: "Class",            feedHeading: "Same city, different worlds",           description: "Social class, wealth gaps, or aspiration" },
  { slug: "race",            label: "Race",             feedHeading: "The conversation we keep having",       description: "Racial identity, bias, or solidarity" },
  { slug: "gender",          label: "Gender",           feedHeading: "Redefining the rules",                  description: "Gender roles, identity, or expectations" },
  { slug: "parenthood",      label: "Parenthood",       feedHeading: "Nobody's ready for it",                 description: "Raising children, mother- or fatherhood" },

  // Setting / place
  { slug: "lagos",           label: "Lagos",            feedHeading: "The city that never sleeps on you",     description: "Set in Lagos, Nigeria" },
  { slug: "city",            label: "City",             feedHeading: "Urban stories, neon and noise",         description: "Set in or defined by city life" },
  { slug: "village",         label: "Village",          feedHeading: "Roots and red earth",                   description: "Rural settings, ancestral homes" },
  { slug: "diaspora",        label: "Diaspora",         feedHeading: "Between two worlds",                    description: "Africans or Nigerians living abroad" },
  { slug: "campus",          label: "Campus",           feedHeading: "Lecture halls and late nights",         description: "University or school settings" },
  { slug: "workplace",       label: "Workplace",        feedHeading: "Office politics are a sport",           description: "Work culture, colleagues, or careers" },
  { slug: "historical",      label: "Historical",       feedHeading: "Before your time",                      description: "Set in a defined historical era" },

  // Genre / form
  { slug: "thriller",        label: "Thriller",         feedHeading: "Your pulse won't thank you",             description: "Suspense and fast-paced plot" },
  { slug: "mystery",         label: "Mystery",          feedHeading: "Everyone's lying. Find out why.",       description: "Puzzles, secrets, or whodunits" },
  { slug: "psychological",   label: "Psychological",    feedHeading: "Are you sure you're the one telling this story?", description: "Mind games, unreliable narrators, or mental tension" },
  { slug: "speculative",     label: "Speculative",      feedHeading: "What if the world worked differently?", description: "Sci-fi, alternate history, or near-future" },
  { slug: "literary",        label: "Literary",         feedHeading: "Prose that stays with you",             description: "Character-driven, language-forward fiction" },
  { slug: "crime",           label: "Crime",            feedHeading: "Someone's going to get caught",         description: "Heists, murders, con artists, or detectives" },
  { slug: "coming-of-age",   label: "Coming-of-Age",    feedHeading: "Growing up is a full-body experience",  description: "Youth, transition, or first encounters" },
  { slug: "satire",          label: "Satire",           feedHeading: "Nigeria, you cannot shout",             description: "Social, political, or cultural satire" },

  // Character types / archetypes
  { slug: "killer",          label: "Killer",           feedHeading: "Not everyone survives this one",        description: "A murderer, assassin, or violent antagonist" },
  { slug: "antihero",        label: "Antihero",         feedHeading: "Not the hero. But close.",              description: "Morally grey or flawed protagonist" },
  { slug: "outsider",        label: "Outsider",         feedHeading: "Watching from just outside the circle", description: "A character on the margins of society" },
  { slug: "con-artist",      label: "Con Artist",       feedHeading: "Everyone's playing a game",             description: "Deception, schemes, or long cons" },

  // Reader experience
  { slug: "twist-ending",    label: "Twist Ending",     feedHeading: "You will not see it coming",            description: "Stories with a surprising final turn" },
  { slug: "slow-burn",       label: "Slow Burn",        feedHeading: "Worth every slow page",                 description: "Building tension or romance over time" },
  { slug: "quick-read",      label: "Quick Read",       feedHeading: "One sitting, no excuses",               description: "Short, punchy, or fast-paced stories" },
  { slug: "binge-worthy",    label: "Binge-Worthy",     feedHeading: "You said five minutes. It's been two hours.", description: "Addictive, page-turner energy" },
  { slug: "thought-provoking", label: "Thought-Provoking", feedHeading: "Still thinking about it tomorrow",   description: "Ideas that linger long after the last page" },
  { slug: "tragic",          label: "Tragic",           feedHeading: "Don't say we didn't warn you",          description: "Characters who don't make it out okay" },
  { slug: "redemption",      label: "Redemption",       feedHeading: "It's not too late",                     description: "A character making amends or finding grace" },
] as const;

export type StoryTagSlug = (typeof STORY_TAGS)[number]["slug"];

export const TAG_BY_SLUG: Readonly<Record<string, StoryTag>> = Object.fromEntries(
  STORY_TAGS.map((t) => [t.slug, t])
);

export interface TagCategory {
  /** Identifies a multi-tag category in feed-row and browse-page URLs —
   *  distinct from any individual tag's own slug. */
  slug: string;
  /** Shared feed heading for every tag in this category. */
  title: string;
  tagSlugs: readonly string[];
}

/**
 * Explicit groupings of tags that genuinely overlap in reader experience —
 * e.g. dark, creepy, and psychological are all "something unsettling to
 * read alone at night," so they share one feed row instead of splitting
 * attention across three thin ones. Most tags don't need a group; they
 * just stand alone as their own single-tag category (see categoryForTag).
 */
export const TAG_CATEGORIES: readonly TagCategory[] = [
  {
    slug: "dark-creepy-psychological",
    title: "Read alone at night. We dare you",
    tagSlugs: ["dark", "creepy", "psychological"],
  },
];

const CATEGORY_BY_TAG_SLUG: Readonly<Record<string, TagCategory>> = Object.fromEntries(
  TAG_CATEGORIES.flatMap((category) => category.tagSlugs.map((slug) => [slug, category]))
);

/** The category a tag belongs to — its explicit group if one exists, or a
 *  synthetic single-tag category (using that tag's own feedHeading)
 *  otherwise. Every tag resolves to exactly one category either way. */
export function categoryForTag(tagSlug: string): TagCategory {
  const explicit = CATEGORY_BY_TAG_SLUG[tagSlug];
  if (explicit) return explicit;
  const tag = TAG_BY_SLUG[tagSlug];
  return { slug: tagSlug, title: tag?.feedHeading ?? tagSlug, tagSlugs: [tagSlug] };
}

/** Resolves any slug that could appear in a feed-row or browse-page URL —
 *  either a plain tag slug (the common case, still works for every
 *  ungrouped tag exactly as before) or a combined category slug — to its
 *  display title and full member tag list. Null if neither matches. */
export function resolveCategoryBySlug(slug: string): TagCategory | null {
  if (TAG_BY_SLUG[slug]) return categoryForTag(slug);
  return TAG_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

/** Tags that should appear as feed rows, in the order they appear on the feed */
export const FEED_TAG_ORDER: readonly StoryTagSlug[] = [
  "funny",
  "romance",
  "diaspora",
  "thriller",
  "creepy",
  "heartbreak",
  "psychological",
  "literary",
  "dark",
  "lagos",
  "crime",
  "erotic",
  "coming-of-age",
  "twist-ending",
  "satire",
  "tragic",
  "binge-worthy",
];
