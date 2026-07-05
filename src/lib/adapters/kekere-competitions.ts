import type { Competition } from "@prisma/client";
import type { WinnerEntry } from "@/lib/data/kekere-competitions";
import type { MockCompetition } from "@/content/mock/kekere-competitions";

export function toMockCompetition(
  competition: Competition,
  winners: readonly WinnerEntry[] = []
): MockCompetition {
  return {
    id: competition.id,
    slug: competition.slug,
    title: competition.title,
    theme: competition.theme,
    themeDescription: competition.themeDescription,
    deadline: competition.deadline.toISOString(),
    prizeDescription: competition.prizeDescription,
    wordCountLimit: competition.wordCountLimit,
    wordCountMin: competition.wordCountMin ?? undefined,
    status: competition.status,
    pastWinners: winners.map((entry) => ({
      storyId: entry.story.id,
      authorName: entry.story.author.name,
      title: entry.story.title,
    })),
  };
}
