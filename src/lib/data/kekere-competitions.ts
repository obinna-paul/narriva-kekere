import { prisma } from "@/lib/db/prisma";
import { submitStory } from "@/lib/data/kekere-stories";
import { isWordCountEligible, wordCountRangeLabel } from "@/lib/competitions/word-count";
import type { Competition, CompetitionEntry, CompetitionStatus, Story } from "@prisma/client";
import type { StoryWithAuthor } from "@/lib/data/kekere-stories";

export class CompetitionNotFoundError extends Error {
  constructor() {
    super("Competition not found");
    this.name = "CompetitionNotFoundError";
  }
}

export class CompetitionEntryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompetitionEntryError";
  }
}

export interface ListCompetitionsParams {
  status?: CompetitionStatus | CompetitionStatus[];
}

export async function listCompetitions(params: ListCompetitionsParams = {}) {
  const status = params.status;
  return prisma.competition.findMany({
    where: status ? { status: Array.isArray(status) ? { in: status } : status } : undefined,
    orderBy: { deadline: "desc" },
  });
}

export async function getCompetitionBySlug(slug: string): Promise<Competition | null> {
  return prisma.competition.findUnique({ where: { slug } });
}

export async function getCompetitionById(id: string): Promise<Competition | null> {
  return prisma.competition.findUnique({ where: { id } });
}

const winnerInclude = {
  story: {
    include: { author: { select: { id: true, name: true, slug: true, avatarColor: true } } },
  },
} as const;

export type WinnerEntry = CompetitionEntry & {
  story: Story & { author: { id: string; name: string; slug: string | null; avatarColor: string | null } };
};

/** Past winners are public once the competition is COMPLETE — only entries
 * with a placement set (1st/2nd/3rd), not every entrant, and never before
 * COMPLETE (no peeking at who's in the running while judging is open). */
export async function getPublicWinners(competitionId: string): Promise<WinnerEntry[]> {
  const competition = await getCompetitionById(competitionId);
  if (!competition || competition.status !== "COMPLETE") return [];

  return prisma.competitionEntry.findMany({
    where: { competitionId, placement: { not: null } },
    include: winnerInclude,
    orderBy: { placement: "asc" },
  });
}

export interface AllWinnerEntry {
  story: StoryWithAuthor;
  // null for a story marked CHAMPION tier directly rather than through a
  // formal, judged competition entry — see the second query below.
  placement: number | null;
  competitionTitle: string | null;
}

const storyWithAuthorInclude = {
  author: { select: { id: true, name: true, slug: true, avatarColor: true } },
  tags: { include: { tag: true } },
} as const;

/**
 * Winner's Circle sourcing has two independent paths, both surfaced here:
 * 1. A formal competition entry with a placement, once that competition is
 *    COMPLETE — the full judged-competition pipeline.
 * 2. A story an admin has directly marked CHAMPION tier — a lighter-weight
 *    way to feature a past winner or shortlisted story that was never run
 *    through a formal CompetitionEntry (e.g. onboarded pre-launch). These
 *    have no real placement/competition to show, so both are null.
 * A story covered by path 1 is excluded from path 2 so it isn't duplicated.
 */
export async function getAllWinners(): Promise<AllWinnerEntry[]> {
  const entries = await prisma.competitionEntry.findMany({
    where: {
      competition: { status: "COMPLETE" },
      placement: { not: null },
    },
    include: {
      story: { include: storyWithAuthorInclude },
      competition: { select: { title: true } },
    },
    orderBy: { placement: "asc" },
  });

  const competitionWinners: AllWinnerEntry[] = entries.map((e) => ({
    story: e.story,
    placement: e.placement!,
    competitionTitle: e.competition.title,
  }));

  const championStories = await prisma.story.findMany({
    where: {
      tier: "CHAMPION",
      status: "PUBLISHED",
      id: { notIn: entries.map((e) => e.story.id) },
    },
    include: storyWithAuthorInclude,
    orderBy: { publishedAt: "desc" },
  });

  const tierChampions: AllWinnerEntry[] = championStories.map((story) => ({
    story,
    placement: null,
    competitionTitle: null,
  }));

  return [...competitionWinners, ...tierChampions];
}

/** Admin-only — every entry, any status, regardless of where judging stands
 * (the public winners list above is what's gated to COMPLETE-only, not this). */
export async function listEntriesForAdmin(competitionId: string): Promise<WinnerEntry[]> {
  return prisma.competitionEntry.findMany({
    where: { competitionId },
    include: winnerInclude,
    orderBy: { createdAt: "asc" },
  });
}

export interface CompetitionInput {
  slug: string;
  title: string;
  theme: string;
  themeDescription: string;
  deadline: Date;
  prizeDescription: string;
  wordCountLimit: number;
  /** Optional floor for a word-count range ("1,000-1,500 words") rather
   * than a single ceiling. */
  wordCountMin?: number | null;
  status?: CompetitionStatus;
}

export async function createCompetition(input: CompetitionInput): Promise<Competition> {
  return prisma.competition.create({ data: input });
}

export async function updateCompetition(
  id: string,
  input: Partial<CompetitionInput>
): Promise<Competition> {
  return prisma.competition.update({ where: { id }, data: input });
}

export interface PlacementInput {
  entryId: string;
  placement: number | null;
}

/** Sets placement on the chosen entries and flips the competition to
 * COMPLETE in one go — picking winners IS what closes judging here. */
export async function selectWinners(
  competitionId: string,
  placements: PlacementInput[]
): Promise<Competition> {
  await prisma.$transaction(
    placements.map((p) =>
      prisma.competitionEntry.update({
        where: { id: p.entryId },
        data: { placement: p.placement },
      })
    )
  );

  return prisma.competition.update({
    where: { id: competitionId },
    data: { status: "COMPLETE" },
  });
}

function wordCountRangeError(
  wordCount: number,
  min: number | null,
  max: number
): string | null {
  if (isWordCountEligible(wordCount, min, max)) return null;

  const rangeLabel = wordCountRangeLabel(min, max);
  return wordCount > max
    ? `This competition asks for ${rangeLabel} words — your story is ${wordCount.toLocaleString()} words.`
    : `This competition asks for ${rangeLabel} words — your story is only ${wordCount.toLocaleString()} words.`;
}

/**
 * Enters a story into a competition. Only a plain DRAFT story is eligible —
 * unpublished, unrejected, and never submitted for review — since both
 * entry paths (picking an existing draft, or uploading a document that
 * creates a fresh one) only ever hand this a brand-new draft. Submitting
 * flips the story straight to SUBMITTED (the normal moderation queue, same
 * as any regular submission) and creates the CompetitionEntry in one step.
 */
export async function submitStoryToCompetition(
  competitionId: string,
  userId: string,
  storyId: string
): Promise<CompetitionEntry> {
  const competition = await getCompetitionById(competitionId);
  if (!competition) throw new CompetitionNotFoundError();

  if (competition.status !== "OPEN") {
    throw new CompetitionEntryError("This competition isn't open for entries.");
  }
  if (competition.deadline.getTime() < Date.now()) {
    throw new CompetitionEntryError("Submissions closed — the deadline has passed.");
  }

  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story) throw new CompetitionEntryError("Story not found.");
  if (story.authorId !== userId) throw new CompetitionEntryError("That story isn't yours.");

  if (story.status !== "DRAFT") {
    throw new CompetitionEntryError(
      "Only an unpublished draft that hasn't been submitted for review can be entered into a competition."
    );
  }

  const wordCountError = wordCountRangeError(story.wordCount, competition.wordCountMin, competition.wordCountLimit);
  if (wordCountError) throw new CompetitionEntryError(wordCountError);

  const existingEntry = await prisma.competitionEntry.findUnique({
    where: { competitionId_storyId: { competitionId, storyId } },
  });
  if (existingEntry) throw new CompetitionEntryError("Already entered into this competition.");

  // Ride the normal moderation path the moment the story is entered.
  await submitStory(storyId, userId);

  return prisma.competitionEntry.create({ data: { competitionId, storyId } });
}
