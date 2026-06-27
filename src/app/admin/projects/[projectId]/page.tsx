import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { ProjectStageManager } from "@/components/admin/project-stage-manager";
import { DeliverableManager } from "@/components/admin/deliverable-manager";

export const dynamic = "force-dynamic";

const stageLabels: Record<string, string> = {
  INQUIRY: "Inquiry", CONTRACT_SENT: "Contract sent", ONBOARDING: "Onboarding",
  MANUSCRIPT_REVIEW: "Manuscript review", DEVELOPMENTAL_EDIT: "Developmental edit",
  COPYEDIT: "Copyedit", COVER_DESIGN: "Cover design", INTERIOR_TYPESET: "Interior design",
  AUTHOR_REVIEW: "Author review", PROOFREAD: "Proofread", PRINTING: "Printing",
  MARKETING: "Marketing", RELEASED: "Released",
};

export default async function AdminProjectDetail({ params }: { params: { projectId: string } }) {
  const project = await prisma.authorProject.findUnique({
    where: { id: params.projectId },
    include: { author: { select: { name: true, email: true } }, deliverables: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) notFound();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "32px", maxWidth: "900px", margin: "0 auto", background: "#f8f6f3", minHeight: "100vh" }}>
      <Link href="/admin/projects" style={{ color: "#C75D2C", fontSize: "14px" }}>← Projects</Link>
      <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "12px 0 4px" }}>{project.title}</h1>
      <p style={{ color: "#888", fontSize: "14px", marginBottom: "24px" }}>
        {project.author.name} · {project.author.email} · {project.type.replace(/_/g, " ")}
      </p>

      <ProjectStageManager projectId={project.id} currentStage={project.stage} stageNote={project.stageNote} />

      <div className="mt-8">
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>Deliverables</h2>
        <DeliverableManager projectId={project.id} deliverables={project.deliverables} />
      </div>
    </div>
  );
}
