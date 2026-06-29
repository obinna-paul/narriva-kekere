import { prisma } from "@/lib/db/prisma";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";

export class VersionNotFoundError extends Error {
  constructor() {
    super("Version not found");
    this.name = "VersionNotFoundError";
  }
}

export class RestoreIllegalStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RestoreIllegalStateError";
  }
}

const MAX_VERSIONS = 20;
const RESTORABLE_STATUSES = ["DRAFT", "REVISIONS_REQUESTED"] as const;

export interface VersionSummary {
  id: string;
  versionNumber: number;
  wordCount: number;
  label: string;
  savedAt: Date;
}

/**
 * Snapshots the story's CURRENT body/wordCount as a new version, then
 * enforces the 20-version retention cap — oldest versions are deleted
 * first, but anything labeled "Submitted" is never deleted (it's the
 * permanent record of what was actually reviewed).
 */
export async function createVersionSnapshot(storyId: string, label: string): Promise<VersionSummary> {
  const story = await prisma.story.findUniqueOrThrow({
    where: { id: storyId },
    select: { body: true, wordCount: true },
  });

  return prisma.$transaction(async (tx) => {
    const existing = await tx.storyVersion.findMany({
      where: { storyId },
      orderBy: { versionNumber: "asc" },
      select: { id: true, versionNumber: true, label: true },
    });

    if (existing.length >= MAX_VERSIONS) {
      const deletable = existing.filter((v) => !v.label.includes("Submitted"));
      const overflow = existing.length - (MAX_VERSIONS - 1);
      const toDelete = deletable.slice(0, Math.max(0, overflow));
      if (toDelete.length > 0) {
        await tx.storyVersion.deleteMany({ where: { id: { in: toDelete.map((v) => v.id) } } });
      }
    }

    const lastVersionNumber = existing.length > 0 ? existing[existing.length - 1].versionNumber : 0;

    return tx.storyVersion.create({
      data: {
        storyId,
        versionNumber: lastVersionNumber + 1,
        content: story.body as object,
        wordCount: story.wordCount,
        label,
      },
      select: { id: true, versionNumber: true, wordCount: true, label: true, savedAt: true },
    });
  });
}

/** Used by the PUT save endpoint — fires a labeled "Auto-save" snapshot
 * only if the most recent version is more than `minIntervalMs` old (or
 * none exists yet). Cheap to call on every save; usually a no-op. */
export async function maybeCreateAutoSnapshot(storyId: string, minIntervalMs: number): Promise<void> {
  const latest = await prisma.storyVersion.findFirst({
    where: { storyId },
    orderBy: { savedAt: "desc" },
    select: { savedAt: true },
  });

  if (latest && Date.now() - latest.savedAt.getTime() < minIntervalMs) return;

  await createVersionSnapshot(storyId, "Auto-save");
}

export async function listVersions(storyId: string): Promise<VersionSummary[]> {
  return prisma.storyVersion.findMany({
    where: { storyId },
    orderBy: { versionNumber: "desc" },
    select: { id: true, versionNumber: true, wordCount: true, label: true, savedAt: true },
  });
}

export interface VersionWithContent extends VersionSummary {
  content: TiptapDoc;
}

export async function getVersion(storyId: string, versionId: string): Promise<VersionWithContent> {
  const version = await prisma.storyVersion.findFirst({
    where: { id: versionId, storyId },
  });
  if (!version) throw new VersionNotFoundError();
  return { ...version, content: version.content as unknown as TiptapDoc };
}

export interface RestoreResult {
  restoredFrom: { versionNumber: number; savedAt: Date };
}

/**
 * Snapshots the CURRENT content first (labeled "Before restore — ...") so
 * the writer can undo the restore itself, then overwrites the story body
 * with the target version's content — all in one transaction.
 */
export async function restoreVersion(storyId: string, versionId: string): Promise<RestoreResult> {
  const story = await prisma.story.findUniqueOrThrow({
    where: { id: storyId },
    select: { status: true },
  });
  if (!RESTORABLE_STATUSES.includes(story.status as typeof RESTORABLE_STATUSES[number])) {
    throw new RestoreIllegalStateError(
      "Can't restore a published story — it's already live. Contact admin for changes."
    );
  }

  const target = await getVersion(storyId, versionId);

  return prisma.$transaction(async (tx) => {
    const before = await tx.story.findUniqueOrThrow({
      where: { id: storyId },
      select: { body: true, wordCount: true },
    });

    const existing = await tx.storyVersion.findMany({
      where: { storyId },
      select: { versionNumber: true },
      orderBy: { versionNumber: "desc" },
      take: 1,
    });
    const nextVersionNumber = (existing[0]?.versionNumber ?? 0) + 1;

    await tx.storyVersion.create({
      data: {
        storyId,
        versionNumber: nextVersionNumber,
        content: before.body as object,
        wordCount: before.wordCount,
        label: `Before restore — ${new Date().toISOString()}`,
      },
    });

    const now = new Date();
    await tx.story.update({
      where: { id: storyId },
      data: {
        body: target.content as object,
        wordCount: target.wordCount,
        lastSavedAt: now,
      },
    });

    return { restoredFrom: { versionNumber: target.versionNumber, savedAt: target.savedAt } };
  });
}
