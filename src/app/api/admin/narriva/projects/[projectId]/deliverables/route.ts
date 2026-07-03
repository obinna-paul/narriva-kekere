export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { uploadPortalFile } from "@/lib/storage/r2";
import { sendEmail } from "@/lib/email/send";
import type { ProjectStage } from "@prisma/client";

const STAGES = ["ASSESSMENT", "EDITORIAL", "DESIGN", "PRODUCTION", "LAUNCHED"] as const;

export const POST = withAuth(
  async (request, session, { params }) => {
    const { projectId } = params as { projectId: string };

    const project = await prisma.authorProject.findUnique({
      where: { id: projectId },
      include: { user: { select: { name: true, email: true } } },
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

    const stageRaw = formData.get("stage");
    const stageParse = z.enum(STAGES).safeParse(stageRaw);
    if (!stageParse.success) {
      return NextResponse.json(
        { error: "Invalid stage.", details: stageParse.error.flatten() },
        { status: 400 }
      );
    }

    const sendForReview = formData.get("sendForReview") === "true";
    const existingDeliverableId = formData.get("existingDeliverableId");

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileRef = await uploadPortalFile(buffer, file.name, file.type);

    let deliverable: { id: string; label: string; status: string };

    if (existingDeliverableId && typeof existingDeliverableId === "string") {
      const existing = await prisma.projectDeliverable.findUnique({
        where: { id: existingDeliverableId },
        include: {
          versions: { orderBy: { versionNumber: "desc" }, take: 1 },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Existing deliverable not found." },
          { status: 404 }
        );
      }

      if (existing.projectId !== projectId) {
        return NextResponse.json(
          { error: "Deliverable does not belong to this project." },
          { status: 400 }
        );
      }

      const nextVersionNumber = (existing.versions[0]?.versionNumber ?? 0) + 1;

      const updateData: { status?: "FOR_REVIEW" } = {};
      if (sendForReview) {
        updateData.status = "FOR_REVIEW";
      }

      await prisma.$transaction([
        ...(Object.keys(updateData).length > 0
          ? [
              prisma.projectDeliverable.update({
                where: { id: existingDeliverableId },
                data: updateData,
              }),
            ]
          : []),
        prisma.deliverableVersion.create({
          data: {
            deliverableId: existingDeliverableId,
            versionNumber: nextVersionNumber,
            fileRef,
            fileType: file.type,
            fileSizeBytes: file.size,
            uploadedBy: session.user.name ?? "Admin",
          },
        }),
      ]);

      deliverable = {
        id: existing.id,
        label: existing.label,
        status: sendForReview ? "FOR_REVIEW" : existing.status,
      };
    } else {
      const newDeliverable = await prisma.projectDeliverable.create({
        data: {
          projectId,
          label: label.trim(),
          stage: stageParse.data as ProjectStage,
          status: sendForReview ? "FOR_REVIEW" : "DRAFT",
          uploadedBy: session.user.name ?? "Admin",
        },
      });

      await prisma.deliverableVersion.create({
        data: {
          deliverableId: newDeliverable.id,
          versionNumber: 1,
          fileRef,
          fileType: file.type,
          fileSizeBytes: file.size,
          uploadedBy: session.user.name ?? "Admin",
        },
      });

      deliverable = {
        id: newDeliverable.id,
        label: newDeliverable.label,
        status: newDeliverable.status,
      };
    }

    if (sendForReview && project.user.email) {
      await sendEmail({
        to: project.user.email,
        subject: `A new file is ready for your review — ${deliverable.label}`,
        body: `Please log into your author portal at narriva.com/portal to review and approve: ${deliverable.label}.`,
      });
    }

    return NextResponse.json({ success: true, deliverable });
  },
  { roles: ["ADMIN"] }
);
