export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { NarrivaSubmissionStatus } from "@prisma/client";

const VALID_STATUSES: NarrivaSubmissionStatus[] = ["RECEIVED", "READING", "REVIEWED", "ACCEPTED", "DECLINED"];

// Map the SubmissionsView's filter labels to Prisma enum values
const STATUS_MAP: Record<string, NarrivaSubmissionStatus[]> = {
  PENDING: ["RECEIVED"],
  UNDER_REVIEW: ["READING", "REVIEWED"],
  ON_HOLD: ["READING"],
  ACCEPTED: ["ACCEPTED"],
  REJECTED: ["DECLINED"],
};

export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const filterParam = url.searchParams.get("status") ?? "PENDING";
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10)));

    const statusIn = STATUS_MAP[filterParam] ?? ["RECEIVED"];

    const [submissions, total] = await Promise.all([
      prisma.narrivaSubmission.findMany({
        where: { status: { in: statusIn } },
        select: {
          id: true,
          manuscriptTitle: true,
          authorName: true,
          authorEmail: true,
          genre: true,
          supportNeeded: true,
          status: true,
          reviewerNotes: true,
          submittedAt: true,
          updatedAt: true,
        },
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.narrivaSubmission.count({ where: { status: { in: statusIn } } }),
    ]);

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      submissions: submissions.map((s) => ({
        id: s.id,
        manuscriptTitle: s.manuscriptTitle,
        authorName: s.authorName,
        email: s.authorEmail,
        genre: s.genre,
        wordCount: null,
        serviceType: s.supportNeeded?.join(", ") || null,
        status: filterParam,
        submittedAt: s.submittedAt.toISOString(),
        reviewedAt: s.updatedAt.toISOString(),
        notes: s.reviewerNotes,
      })),
    });
  },
  { roles: ["ADMIN"] }
);
