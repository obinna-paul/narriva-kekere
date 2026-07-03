export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getPortalFileDownloadUrl } from "@/lib/storage/r2";

export const GET = withAuth(async (request, session, { params }) => {
  const userId = session.user.id;
  const { deliverableId } = params as { projectId: string; deliverableId: string };

  const deliverable = await prisma.projectDeliverable.findUnique({
    where: { id: deliverableId },
    include: {
      project: { select: { userId: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        select: {
          id: true,
          versionNumber: true,
          fileType: true,
          fileSizeBytes: true,
          uploadedBy: true,
          uploadedAt: true,
          fileRef: true,
        },
      },
      comments: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { name: true } },
        },
      },
    },
  });

  if (!deliverable) {
    return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
  }

  if (deliverable.project.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let downloadUrl: string | null = null;
  const latestVersion = deliverable.versions[0];

  if (latestVersion) {
    downloadUrl = await getPortalFileDownloadUrl(latestVersion.fileRef);
  }

  return NextResponse.json({
    id: deliverable.id,
    label: deliverable.label,
    stage: deliverable.stage,
    status: deliverable.status,
    uploadedBy: deliverable.uploadedBy,
    createdAt: deliverable.createdAt.toISOString(),
    updatedAt: deliverable.updatedAt.toISOString(),
    downloadUrl,
    versions: deliverable.versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      fileType: v.fileType,
      fileSizeBytes: v.fileSizeBytes,
      uploadedBy: v.uploadedBy,
      uploadedAt: v.uploadedAt.toISOString(),
    })),
    comments: deliverable.comments.map((c) => ({
      id: c.id,
      authorId: c.authorId,
      authorName: c.author.name,
      authorRole: c.authorRole,
      body: c.body,
      isKeyDecision: c.isKeyDecision,
      createdAt: c.createdAt.toISOString(),
    })),
  });
});
