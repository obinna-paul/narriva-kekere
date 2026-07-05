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

// Kekere's first-ever writing competition. Submissions closed May 31, 2026;
// judging is underway. Longlist is out, shortlist and winner are still to
// come — see the dates in themeDescription below.
export const MOCK_COMPETITIONS: readonly MockCompetition[] = [
  {
    slug: "kekere-flash-fiction-prize-2026",
    title: "The Kekere Flash Fiction Prize 2026",
    theme: "No fixed theme — flash fiction from Nigerian writers, judged on voice",
    themeDescription:
      "Kekere's first-ever writing competition. No set prompt — we read for stories with a lasting impression, told with beautiful narration and an interesting writing voice. Stories can be set anywhere in the world, but we expect submissions from Nigerian writers.\n\nSubmissions opened May 1, 2026 and closed May 31, 2026. Judging is underway now. The longlist has been released on our Instagram: https://www.instagram.com/p/DaVQC7ZjKbL/?igsh=YWg3YXpwNGRzanMz. The shortlist will be announced July 25, 2026, and the winner on July 31, 2026.",
    deadline: "2026-05-31",
    prizeDescription: "₦100,000 for the winner, with consolation prizes for the runners-up.",
    wordCountLimit: 1000,
    status: "JUDGING",
  },
] as const;

export function getCompetitionBySlug(slug: string): MockCompetition | undefined {
  return MOCK_COMPETITIONS.find((c) => c.slug === slug);
}
