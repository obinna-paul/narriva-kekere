import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { uploadPortalFile } from "@/lib/storage/r2";

export const POST = withAuth(
  async (request, session, { params }) => {
    const { projectId } = params as { projectId: string };

    const project = await prisma.authorProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const formData = await request.formData();

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const label = formData.get("label");
    if (!label || typeof label !== "string" || !label.trim()) {
      return NextResponse.json({ error: "Label is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileRef = await uploadPortalFile(buffer, file.name, file.type);

    await prisma.projectDocument.create({
      data: {
        projectId,
        label: label.trim(),
        fileRef,
        fileType: file.type,
        uploadedBy: session.user.name ?? "Admin",
      },
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] }
);
