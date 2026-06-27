// Matches the real Prisma CompetitionStatus enum (Phase 13) — DRAFT/COMPLETE
// weren't in the original Phase 10 mock set, but the type needs to cover
// them so the real-data adapter can produce this same shape.
export type CompetitionStatus = "DRAFT" | "OPEN" | "CLOSED" | "JUDGING" | "COMPLETE";

export interface MockCompetitionWinner {
  storyId: string;
  authorName: string;
  title: string;
}

export interface MockCompetition {
  slug: string;
  title: string;
  theme: string;
  themeDescription: string;
  deadline: string;
  prizeDescription: string;
  prizeAmount?: string;
  wordCountLimit: number;
  status: CompetitionStatus;
  rules?: readonly string[];
  pastWinners?: readonly MockCompetitionWinner[];
}

export const MOCK_COMPETITIONS: readonly MockCompetition[] = [
  {
    slug: "harmattan-2026",
    title: "The Harmattan Cycle",
    theme: "Dust and distance",
    themeDescription:
      "Stories about the season Lagos pretends doesn't happen to it — the dry wind, the dust on everything, the people who leave for it and the people who wait. We're not looking for weather descriptions. We're looking for what the dry season makes people do.",
    deadline: "2026-08-15",
    prizeDescription:
      "The winning story's author gets a full manuscript read at Narriva, plus a featured slot on the Kekere homepage for one month.",
    prizeAmount: "₦150,000",
    wordCountLimit: 3000,
    status: "OPEN",
    rules: [
      "3,000 words maximum. Shorter is welcome.",
      "Open to writers across Africa and the diaspora.",
      "Previously unpublished stories only.",
      "One entry per writer. Submit through the writer's editor.",
    ],
  },
  {
    slug: "first-light-2026",
    title: "First Light",
    theme: "Beginnings nobody asked for",
    themeDescription:
      "A story about a beginning that arrived uninvited — a new job, a new city, a new sibling, a diagnosis. We want the version of \"new\" that nobody throws a party for.",
    deadline: "2026-07-01",
    prizeDescription:
      "The winning story's author gets a full manuscript read at Narriva, plus a featured slot on the Kekere homepage for one month.",
    prizeAmount: "₦120,000",
    wordCountLimit: 2500,
    status: "JUDGING",
    rules: [
      "2,500 words maximum. Shorter is welcome.",
      "Open to writers across Africa and the diaspora.",
      "Previously unpublished stories only.",
      "One entry per writer. Submit through the writer's editor.",
    ],
  },
  {
    slug: "small-gods-2025",
    title: "Small Gods",
    theme: "The minor superstitions we actually keep",
    themeDescription:
      "Not the big myths — the small private ones. The thing you still do even though you know better. We wanted stories about the superstitions people keep quietly, on purpose, without defending them to anyone.",
    deadline: "2025-12-10",
    prizeDescription:
      "The winning story's author got a full manuscript read at Narriva, plus a featured slot on the Kekere homepage for one month.",
    prizeAmount: "₦100,000",
    wordCountLimit: 3000,
    status: "CLOSED",
    pastWinners: [
      {
        storyId: "nkem-and-the-quiet-house",
        authorName: "Chiamaka Udo",
        title: "Nkem and the Quiet House",
      },
    ],
  },
  {
    slug: "the-long-table-2025",
    title: "The Long Table",
    theme: "Food as an argument",
    themeDescription:
      "A story where food is doing more work than just being food — an inheritance, an apology, a fight nobody's having out loud. Kitchens, markets, the one dish that means something specific in your family and nobody else's.",
    deadline: "2025-09-20",
    prizeDescription:
      "The winning story's author got a full manuscript read at Narriva, plus a featured slot on the Kekere homepage for one month.",
    prizeAmount: "₦100,000",
    wordCountLimit: 2500,
    status: "CLOSED",
    pastWinners: [
      {
        storyId: "jollof-wars",
        authorName: "Femi Okonkwo",
        title: "Jollof Wars",
      },
    ],
  },
] as const;

export function getCompetitionBySlug(slug: string): MockCompetition | undefined {
  return MOCK_COMPETITIONS.find((c) => c.slug === slug);
}
