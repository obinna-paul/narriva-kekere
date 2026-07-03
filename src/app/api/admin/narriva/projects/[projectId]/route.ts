export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getPortalFileDownloadUrl } from "@/lib/storage/r2";
import type { ProjectStage } from "@prisma/client";

const STAGE_META: Record<ProjectStage, { description: string; estimatedWeeks: string | null }> = {
  ASSESSMENT: {
    description: "We are reviewing your manuscript and assessing what it needs.",
    estimatedWeeks: "1–2 weeks",
  },
  EDITORIAL: {
    description: "Your manuscript is in active editorial development.",
    estimatedWeeks: "4–8 weeks",
  },
  DESIGN: {
    description: "Cover and interior design are being developed.",
    estimatedWeeks: "3–5 weeks",
  },
  PRODUCTION: {
    description: "Your book is being prepared for publication.",
    estimatedWeeks: "2–3 weeks",
  },
  LAUNCHED: {
    description: "Your book is live in the Narriva bookstore.",
    estimatedWeeks: null,
  },
};

export const GET = withAuth(
  async (request, _session, { params }) => {
    const { projectId } = params as { projectId: string };

    const project = await prisma.authorProject.findUnique({
      where: { id: projectId },
      include: {
        user: { select: { name: true, email: true } },
        submission: { select: { manuscriptTitle: true, submittedAt: true } },
        deliverables: {
          include: {
            versions: { orderBy: { versionNumber: "desc" } },
            comments: {
              include: { author: { select: { name: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        messages: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        },
        tasks: { orderBy: { createdAt: "asc" } },
        documents: { orderBy: { uploadedAt: "desc" } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const deliverables = await Promise.all(
      project.deliverables.map(async (d) => {
        const latestVersion = d.versions[0];
        return {
          id: d.id,
          label: d.label,
          stage: d.stage,
          status: d.status,
          uploadedBy: d.uploadedBy,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
          downloadUrl: latestVersion
            ? await getPortalFileDownloadUrl(latestVersion.fileRef)
            : null,
          versions: d.versions.map((v) => ({
            id: v.id,
            versionNumber: v.versionNumber,
            fileType: v.fileType,
            fileSizeBytes: v.fileSizeBytes,
            uploadedBy: v.uploadedBy,
            uploadedAt: v.uploadedAt.toISOString(),
          })),
          comments: d.comments.map((c) => ({
            id: c.id,
            authorId: c.authorId,
            authorName: c.author.name,
            authorRole: c.authorRole,
            body: c.body,
            isInternal: c.isInternal,
            isKeyDecision: c.isKeyDecision,
            createdAt: c.createdAt.toISOString(),
          })),
        };
      })
    );

    const documents = await Promise.all(
      project.documents.map(async (d) => ({
        id: d.id,
        label: d.label,
        fileType: d.fileType,
        uploadedAt: d.uploadedAt.toISOString(),
        downloadUrl: await getPortalFileDownloadUrl(d.fileRef),
      }))
    );

    return NextResponse.json({
      id: project.id,
      bookTitle: project.bookTitle,
      coverImageRef: project.coverImageRef,
      currentStage: project.currentStage,
      statusNote: project.statusNote,
      expectedPubDate: project.expectedPubDate?.toISOString() ?? null,
      isbn: project.isbn,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      author: {
        id: project.userId,
        name: project.user.name,
        email: project.user.email,
      },
      submission: {
        manuscriptTitle: project.submission.manuscriptTitle,
        submittedAt: project.submission.submittedAt.toISOString(),
      },
      currentStageMeta: STAGE_META[project.currentStage],
      deliverables,
      documents,
      messages: project.messages.map((m) => ({
        id: m.id,
        authorId: m.authorId,
        authorName: m.author.name,
        authorRole: m.authorRole,
        body: m.body,
        isInternal: m.isInternal,
        isPinned: m.isPinned,
        pinnedLabel: m.pinnedLabel,
        createdAt: m.createdAt.toISOString(),
      })),
      tasks: project.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        assignedTo: t.assignedTo,
        dueDate: t.dueDate?.toISOString() ?? null,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  },
  { roles: ["ADMIN"] }
);
