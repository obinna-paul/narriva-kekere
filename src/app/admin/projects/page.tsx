import Link from "next/link";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const projects = await prisma.authorProject.findMany({
    include: { author: { select: { name: true, email: true } }, deliverables: { select: { id: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const stages = ["INQUIRY","CONTRACT_SENT","ONBOARDING","MANUSCRIPT_REVIEW","DEVELOPMENTAL_EDIT","COPYEDIT","COVER_DESIGN","INTERIOR_TYPESET","AUTHOR_REVIEW","PROOFREAD","PRINTING","MARKETING","RELEASED"];
  const stageLabels: Record<string,string> = { INQUIRY:"Inquiry", CONTRACT_SENT:"Contract sent", ONBOARDING:"Onboarding", MANUSCRIPT_REVIEW:"Manuscript review", DEVELOPMENTAL_EDIT:"Dev edit", COPYEDIT:"Copyedit", COVER_DESIGN:"Cover design", INTERIOR_TYPESET:"Interior", AUTHOR_REVIEW:"Author review", PROOFREAD:"Proofread", PRINTING:"Printing", MARKETING:"Marketing", RELEASED:"Released" };
  const typeLabels: Record<string,string> = { FULL_PUBLISHING:"Full publishing", EDITORIAL:"Editorial", COVER_DESIGN:"Cover design", GHOSTWRITING:"Ghostwriting", AUTHOR_GROWTH:"Author growth" };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "32px", maxWidth: "1100px", margin: "0 auto", background: "#f8f6f3", minHeight: "100vh" }}>
      <Link href="/admin" style={{ color: "#C75D2C", fontSize: "14px" }}>← Dashboard</Link>
      <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "16px 0 24px" }}>Projects</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/admin/projects/${project.id}`}
            style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eee", padding: "20px", textDecoration: "none", color: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <h3 style={{ fontWeight: 600, fontSize: "16px" }}>{project.title}</h3>
              <p style={{ color: "#888", fontSize: "13px" }}>{project.author.name} · {typeLabels[project.type]}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "12px", color: "#999" }}>{project.deliverables.length} deliverables</span>
              <span style={{ padding: "4px 12px", borderRadius: "20px", background: "#f0e8d8", color: "#C75D2C", fontSize: "12px", fontWeight: 600 }}>{stageLabels[project.stage]}</span>
            </div>
          </Link>
        ))}
        {projects.length === 0 && <p style={{ color: "#999" }}>No projects yet.</p>}
      </div>
    </div>
  );
}
