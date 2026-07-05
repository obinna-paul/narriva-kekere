import { prisma } from "@/lib/db/prisma";
import { submitStory } from "@/lib/data/kekere-stories";
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
  placement: number;
  competitionTitle: string;
}

const storyWithAuthorInclude = {
  author: { select: { id: true, name: true, slug: true, avatarColor: true } },
  tags: { include: { tag: true } },
} as const;

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

  return entries.map((e) => ({
    story: e.story,
    placement: e.placement!,
    competitionTitle: e.competition.title,
  }));
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

/**
 * Recommended flow (documented per the spec's ask): a DRAFT story can be
 * entered directly — this submits it into the normal moderation queue
 * (DRAFT → SUBMITTED, same path as a regular submission) AND creates the
 * CompetitionEntry at the same time, rather than requiring the story to
 * already be PUBLISHED first. The entry exists either way; it just isn't
 * eligible for judging/winning until the story clears moderation. An
 * already-PUBLISHED story enters directly with no extra step.
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

  if (story.status === "REJECTED") {
    throw new CompetitionEntryError("A rejected story can't be entered into a competition.");
  }

  if (story.wordCount > competition.wordCountLimit) {
    throw new CompetitionEntryError(
      `This competition has a ${competition.wordCountLimit.toLocaleString()}-word limit — your story is ${story.wordCount.toLocaleString()} words.`
    );
  }

  const existingEntry = await prisma.competitionEntry.findUnique({
    where: { competitionId_storyId: { competitionId, storyId } },
  });
  if (existingEntry) throw new CompetitionEntryError("Already entered into this competition.");

  // DRAFT stories ride the normal moderation path the moment they're
  // entered; anything already SUBMITTED/REVISIONS_REQUESTED/PUBLISHED is
  // left as-is.
  if (story.status === "DRAFT") {
    await submitStory(storyId, userId);
  }

  return prisma.competitionEntry.create({ data: { competitionId, storyId } });
}
