import { prisma } from "@/lib/db/prisma";
import type {
  NarrivaSubmission,
  NarrivaSubmissionStage,
  NarrivaSubmissionStatus,
  SubmissionUpdate,
} from "@prisma/client";

export type SubmissionWithUpdates = NarrivaSubmission & { updates: SubmissionUpdate[] };

export interface CreateSubmissionInput {
  authorName: string;
  authorEmail: string;
  userId?: string;
  manuscriptTitle: string;
  manuscriptRef: string;
  synopsis?: string;
  targetAudience?: string;
}

export async function createSubmission(
  data: CreateSubmissionInput
): Promise<NarrivaSubmission> {
  return prisma.narrivaSubmission.create({ data });
}

export interface ListSubmissionsParams {
  status?: NarrivaSubmissionStatus;
}

export async function listSubmissions(
  params: ListSubmissionsParams = {}
): Promise<NarrivaSubmission[]> {
  return prisma.narrivaSubmission.findMany({
    where: params.status ? { status: params.status } : undefined,
    orderBy: { submittedAt: "desc" },
  });
}

export async function getSubmissionById(id: string): Promise<SubmissionWithUpdates | null> {
  return prisma.narrivaSubmission.findUnique({
    where: { id },
    include: { updates: { orderBy: { createdAt: "desc" } } },
  });
}

/** Submissions visible in a logged-in user's Author Portal — matched by
 * userId once an account is linked. See the guest-submission TODO in
 * createSubmission's caller: submissions made as a guest aren't
 * automatically linked to an account created later with the same email. */
export async function getSubmissionsForUser(userId: string): Promise<SubmissionWithUpdates[]> {
  return prisma.narrivaSubmission.findMany({
    where: { userId },
    include: { updates: { orderBy: { createdAt: "desc" } } },
    orderBy: { submittedAt: "desc" },
  });
}

export async function updateSubmissionStatus(
  id: string,
  status: NarrivaSubmissionStatus
): Promise<NarrivaSubmission> {
  return prisma.narrivaSubmission.update({
    where: { id },
    data: {
      status,
      // Accepting a submission starts the Author Portal timeline at SUBMITTED.
      ...(status === "ACCEPTED" ? { currentStage: "SUBMITTED" as NarrivaSubmissionStage } : {}),
    },
  });
}

export async function updateSubmissionStage(
  id: string,
  currentStage: NarrivaSubmissionStage
): Promise<NarrivaSubmission> {
  return prisma.narrivaSubmission.update({ where: { id }, data: { currentStage } });
}

export async function setReviewerNotes(
  id: string,
  reviewerNotes: string
): Promise<NarrivaSubmission> {
  return prisma.narrivaSubmission.update({ where: { id }, data: { reviewerNotes } });
}

export async function addSubmissionUpdate(
  submissionId: string,
  note: string
): Promise<SubmissionUpdate> {
  return prisma.submissionUpdate.create({ data: { submissionId, note } });
}

/** Best-effort account linking: if a guest submission's email matches an
 * existing user, attach it. Called manually by an admin for now — see the
 * Phase 8 TODO on automatic linking at signup. */
export async function linkSubmissionToUser(
  submissionId: string,
  userId: string
): Promise<NarrivaSubmission> {
  return prisma.narrivaSubmission.update({ where: { id: submissionId }, data: { userId } });
}
