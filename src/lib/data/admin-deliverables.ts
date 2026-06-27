import { prisma } from "@/lib/db/prisma";
import type { Deliverable, DeliverableStatus } from "@prisma/client";

export async function createDeliverable(data: {
  projectId: string;
  title: string;
  description?: string;
  fileUrl?: string;
  type: Deliverable["type"];
}) {
  return prisma.deliverable.create({ data });
}

export async function getProjectDeliverables(projectId: string) {
  return prisma.deliverable.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateDeliverable(
  id: string,
  data: {
    title?: string;
    description?: string;
    fileUrl?: string;
    status?: DeliverableStatus;
    authorComment?: string;
    adminNotes?: string;
  },
) {
  return prisma.deliverable.update({ where: { id }, data });
}

export async function getAuthorDeliverables(authorId: string) {
  return prisma.deliverable.findMany({
    where: { project: { authorId } },
    include: { project: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });
}
