import { prisma } from "@/lib/db/prisma";
import { containsProfanity } from "@/lib/moderation/profanity";
import type { ReportReason, ReportStatus, ReportTargetType } from "@prisma/client";

const MAX_DETAILS_LENGTH = 500;

export type CreateReportResult =
  | { success: true }
  | { error: "not_found" | "cannot_report_own_content" | "too_long" | "profanity" };

/**
 * Files a reader's report against a Story or a ParagraphComment. Idempotent
 * on (reporter, target) while an existing report is still OPEN — a
 * double-tap, or reporting again before an admin has acted, doesn't spam
 * the queue with duplicates of the same open report.
 */
export async function createReport(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  details?: string
): Promise<CreateReportResult> {
  const trimmedDetails = details?.trim() || undefined;
  if (trimmedDetails && trimmedDetails.length > MAX_DETAILS_LENGTH) return { error: "too_long" };
  if (trimmedDetails && containsProfanity(trimmedDetails)) return { error: "profanity" };

  if (targetType === "STORY") {
    const story = await prisma.story.findUnique({ where: { id: targetId }, select: { authorId: true } });
    if (!story) return { error: "not_found" };
    if (story.authorId === reporterId) return { error: "cannot_report_own_content" };
  } else {
    const comment = await prisma.paragraphComment.findUnique({ where: { id: targetId }, select: { userId: true } });
    if (!comment) return { error: "not_found" };
    if (comment.userId === reporterId) return { error: "cannot_report_own_content" };
  }

  const existing = await prisma.report.findFirst({
    where: { reporterId, targetType, targetId, status: "OPEN" },
    select: { id: true },
  });
  if (existing) return { success: true };

  await prisma.report.create({
    data: { reporterId, targetType, targetId, reason, details: trimmedDetails },
  });
  return { success: true };
}

export interface ReportListItem {
  id: string;
  targetType: ReportTargetType;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  reporterName: string;
  reporterEmail: string;
  // Resolved target context — null if the underlying content was deleted
  // after the report was filed (the report itself is kept for the record).
  target:
    | { type: "STORY"; storyId: string; title: string; authorName: string }
    | {
        type: "PARAGRAPH_COMMENT";
        commentId: string;
        storyId: string;
        storyTitle: string;
        body: string;
        authorName: string;
      }
    | null;
}

/** Admin queue listing — batches the two possible target lookups (Story vs
 * ParagraphComment) instead of querying per-report, since a report's
 * targetId isn't a real foreign key (see the Report model comment). */
export async function listReports(status: ReportStatus = "OPEN"): Promise<ReportListItem[]> {
  const reports = await prisma.report.findMany({
    where: { status },
    orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" },
    include: { reporter: { select: { name: true, email: true } } },
  });
  if (reports.length === 0) return [];

  const storyIds = Array.from(new Set(reports.filter((r) => r.targetType === "STORY").map((r) => r.targetId)));
  const commentIds = Array.from(
    new Set(reports.filter((r) => r.targetType === "PARAGRAPH_COMMENT").map((r) => r.targetId))
  );

  const [stories, comments] = await Promise.all([
    storyIds.length
      ? prisma.story.findMany({
          where: { id: { in: storyIds } },
          select: { id: true, title: true, author: { select: { name: true } } },
        })
      : Promise.resolve([]),
    commentIds.length
      ? prisma.paragraphComment.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            body: true,
            storyId: true,
            user: { select: { name: true } },
            story: { select: { title: true } },
          },
        })
      : Promise.resolve([]),
  ]);
  const storyMap = new Map(stories.map((s) => [s.id, s]));
  const commentMap = new Map(comments.map((c) => [c.id, c]));

  return reports.map((r) => {
    let target: ReportListItem["target"] = null;
    if (r.targetType === "STORY") {
      const s = storyMap.get(r.targetId);
      if (s) target = { type: "STORY", storyId: s.id, title: s.title, authorName: s.author.name };
    } else {
      const c = commentMap.get(r.targetId);
      if (c) {
        target = {
          type: "PARAGRAPH_COMMENT",
          commentId: c.id,
          storyId: c.storyId,
          storyTitle: c.story.title,
          body: c.body,
          authorName: c.user.name,
        };
      }
    }
    return {
      id: r.id,
      targetType: r.targetType,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      resolutionNotes: r.resolutionNotes,
      reporterName: r.reporter.name,
      reporterEmail: r.reporter.email,
      target,
    };
  });
}

export async function resolveReport(
  reportId: string,
  adminId: string,
  action: "resolve" | "dismiss",
  notes?: string
): Promise<boolean> {
  const report = await prisma.report.findUnique({ where: { id: reportId }, select: { status: true } });
  if (!report || report.status !== "OPEN") return false;

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: action === "resolve" ? "RESOLVED" : "DISMISSED",
      resolvedAt: new Date(),
      resolvedByAdminId: adminId,
      resolutionNotes: notes?.trim() || null,
    },
  });
  return true;
}

export async function getOpenReportCount(): Promise<number> {
  return prisma.report.count({ where: { status: "OPEN" } });
}
