export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { ProjectStage } from "@prisma/client";

export const GET = withAuth(async (request, session, { params }) => {
  const userId = session.user.id;
  const { projectId } = params as { projectId: string };

  const project = await prisma.authorProject.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deliverables = await prisma.projectDeliverable.findMany({
    where: { projectId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: {
          id: true,
          versionNumber: true,
          fileType: true,
          fileSizeBytes: true,
          uploadedAt: true,
        },
      },
      comments: {
        where: { isInternal: false },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const deliverablesByStage = new Map<ProjectStage, typeof formatted>();

  const formatted = deliverables.map((d) => ({
    id: d.id,
    label: d.label,
    stage: d.stage,
    status: d.status,
    uploadedBy: d.uploadedBy,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    latestVersion: d.versions[0] ?? null,
    commentCount: d.comments.length,
  }));

  for (const d of formatted) {
    const existing = deliverablesByStage.get(d.stage);
    if (existing) {
      existing.push(d);
    } else {
      deliverablesByStage.set(d.stage, [d]);
    }
  }

  const grouped = Object.fromEntries(deliverablesByStage);

  return NextResponse.json({ deliverables: formatted, grouped });
});
