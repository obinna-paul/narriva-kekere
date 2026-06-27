import { prisma } from "@/lib/db/prisma";
import type { AuthorProject, Book } from "@prisma/client";

export type AuthorProjectView = AuthorProject;

export const STAGE_LABELS: Record<string, string> = {
  INQUIRY: "Inquiry",
  CONTRACT_SENT: "Contract sent",
  ONBOARDING: "Onboarding",
  MANUSCRIPT_REVIEW: "Manuscript review",
  DEVELOPMENTAL_EDIT: "Developmental edit",
  COPYEDIT: "Copyedit",
  COVER_DESIGN: "Cover design",
  INTERIOR_TYPESET: "Interior design",
  AUTHOR_REVIEW: "Author review",
  PROOFREAD: "Proofread",
  PRINTING: "Printing",
  MARKETING: "Marketing",
  RELEASED: "Released",
};

export const TYPE_LABELS: Record<string, string> = {
  FULL_PUBLISHING: "Full publishing",
  EDITORIAL: "Editorial",
  COVER_DESIGN: "Cover design",
  GHOSTWRITING: "Ghostwriting",
  AUTHOR_GROWTH: "Author growth",
};

const BOOK_INCLUDE = {
  author: { select: { name: true, slug: true } },
} as const;

export async function getAuthorProjects(authorId: string): Promise<AuthorProjectView[]> {
  return prisma.authorProject.findMany({
    where: { authorId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAuthorBooks(authorId: string) {
  return prisma.book.findMany({
    where: { authorId },
    include: BOOK_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function createProject(data: {
  authorId: string;
  title: string;
  type: AuthorProject["type"];
}) {
  return prisma.authorProject.create({ data });
}

export async function updateProjectStage(
  projectId: string,
  stage: AuthorProject["stage"],
  stageNote?: string,
) {
  return prisma.authorProject.update({
    where: { id: projectId },
    data: { stage, stageNote, updatedAt: new Date() },
  });
}

export async function getAllProjects() {
  return prisma.authorProject.findMany({
    include: { author: { select: { name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
  });
}
