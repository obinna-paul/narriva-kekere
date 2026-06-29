import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getPortalFileDownloadUrl } from "@/lib/storage/r2";

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

  const documents = await prisma.projectDocument.findMany({
    where: { projectId },
    orderBy: { uploadedAt: "desc" },
  });

  const result = await Promise.all(
    documents.map(async (d) => ({
      id: d.id,
      label: d.label,
      fileType: d.fileType,
      uploadedAt: d.uploadedAt.toISOString(),
      downloadUrl: await getPortalFileDownloadUrl(d.fileRef),
    }))
  );

  return NextResponse.json({ documents: result });
});
