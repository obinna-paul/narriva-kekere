import Link from "next/link";
import { NarrivaTheme } from "@/components/theme";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { getCurrentSession } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { PortalTabs } from "@/components/narriva/portal/portal-tabs";
import { ProjectProgress } from "@/components/narriva/portal/project-progress";
import { DeliverablesList } from "@/components/narriva/portal/deliverables-list";
import { KeyDecisions } from "@/components/narriva/portal/key-decisions";
import { DocumentsList } from "@/components/narriva/portal/documents-list";
import { BookInfoTab } from "@/components/narriva/portal/book-info-tab";
import type { ProjectStage } from "@prisma/client";

export const dynamic = "force-dynamic";

const STAGE_META: Record<ProjectStage, { description: string; estimatedWeeks: string | null }> = {
  ASSESSMENT: { description: "We are reviewing your manuscript and assessing what it needs.", estimatedWeeks: "1–2 weeks" },
  EDITORIAL: { description: "Your manuscript is in active editorial development.", estimatedWeeks: "4–8 weeks" },
  DESIGN: { description: "Cover and interior design are being developed.", estimatedWeeks: "3–5 weeks" },
  PRODUCTION: { description: "Your book is being prepared for publication.", estimatedWeeks: "2–3 weeks" },
  LAUNCHED: { description: "Your book is live in the Narriva bookstore.", estimatedWeeks: null },
};

const STAGE_ORDER: ProjectStage[] = ["ASSESSMENT", "EDITORIAL", "DESIGN", "PRODUCTION", "LAUNCHED"];

export default async function AuthorPortalPage() {
  const session = await getCurrentSession();
  const uid = session?.user?.id;

  if (!uid) {
    return (
      <NarrivaTheme>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
          <h1 className="font-[family-name:var(--font-display)] text-[32px] font-semibold text-[#161616]">Your Author Portal</h1>
          <p className="mt-3 text-[16px] text-[#55514A]">Sign in to track your book&apos;s production.</p>
          <Link href="/login" className={cn(buttonVariants({ variant: "primary" }), "mt-6 rounded-[8px]")}>Sign in</Link>
        </div>
      </NarrivaTheme>
    );
  }

  const project = await prisma.authorProject.findFirst({
    where: { userId: uid },
    include: {
      submission: { select: { manuscriptTitle: true, submittedAt: true } },
      deliverables: {
        include: {
          versions: { orderBy: { versionNumber: "desc" }, take: 1, select: { versionNumber: true, fileType: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      messages: {
        where: { isInternal: false },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      documents: { orderBy: { uploadedAt: "desc" } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!project) {
    return (
      <NarrivaTheme>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
          <div className="mx-auto mb-5 h-px w-9 bg-[#B08D57]" />
          <h1 className="font-[family-name:var(--font-display)] text-[38px] font-semibold text-[#161616]">Your Author Portal</h1>
          <p className="mt-3 max-w-[420px] text-[16px] leading-[1.6] text-[#55514A]">
            You don&apos;t have a project in production yet. Submit your manuscript and we&apos;ll get started.
          </p>
          <Link href="/narriva/submit" className={cn(buttonVariants({ variant: "primary" }), "mt-6 rounded-[8px] bg-[#1E3A8A] hover:bg-[#1E3A8A]/90")}>
            Submit your manuscript
          </Link>
        </div>
      </NarrivaTheme>
    );
  }

  const pendingReviewCount = project.deliverables.filter((d) => d.status === "FOR_REVIEW").length;
  const isPublished = project.currentStage === "LAUNCHED";

  // Compute stage statuses
  const currentStageIdx = STAGE_ORDER.indexOf(project.currentStage);
  const progressStages = STAGE_ORDER.map((s, i) => {
    const status = i < currentStageIdx ? "complete" as const : i === currentStageIdx ? "in-progress" as const : "upcoming" as const;
    const meta = STAGE_META[s];
    return {
      key: s,
      label: s.charAt(0) + s.slice(1).toLowerCase(),
      status,
      estimatedWeeks: meta.estimatedWeeks,
      subSteps: status === "in-progress" ? [
        { label: "Initial review", status: "done" as const },
        { label: "Working draft", status: "in-progress" as const },
      ] : undefined,
    };
  });

  // Pinned decisions
  const pinnedDecisions = project.messages
    .filter((m) => m.isPinned)
    .map((m) => ({
      id: m.id,
      body: m.body,
      pinnedLabel: m.pinnedLabel ?? "Key decision",
      createdAt: m.createdAt.toISOString(),
    }));

  // Group deliverables by stage
  const deliverablesByStage: Record<string, typeof project.deliverables> = {};
  for (const d of project.deliverables) {
    const stage = d.stage;
    if (!deliverablesByStage[stage]) deliverablesByStage[stage] = [];
    deliverablesByStage[stage].push(d);
  }

  // Map deliverables for list view
  const deliverableItems = project.deliverables.map((d) => ({
    id: d.id,
    label: d.label,
    stage: d.stage,
    status: d.status as "DRAFT" | "FOR_REVIEW" | "CHANGES_REQUESTED" | "APPROVED",
    uploadedBy: d.uploadedBy,
    createdAt: d.createdAt.toISOString(),
    commentCount: 0,
    latestVersion: d.versions[0] ? { versionNumber: d.versions[0].versionNumber, fileType: d.versions[0].fileType } : undefined,
  }));

  const groupedForList: Record<string, typeof deliverableItems> = {};
  for (const item of deliverableItems) {
    if (!groupedForList[item.stage]) groupedForList[item.stage] = [];
    groupedForList[item.stage].push(item);
  }

  return (
    <NarrivaTheme>
      <div className="min-h-screen" style={{ background: "#FAF8F4" }}>
        <div className="mx-auto max-w-[1080px] px-6 py-10">
          {/* Project header */}
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#B08D57]">Your project</p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-[38px] font-semibold leading-[1.08] text-[#161616] tracking-[-0.01em]">
                {project.bookTitle}
              </h1>
              <div className="mt-2 flex items-center gap-3">
                {STAGE_ORDER.indexOf(project.currentStage) >= 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#1E3A8A]/10 px-3 py-1 text-[13px] font-semibold text-[#1E3A8A]">
                    <span className="h-[6px] w-[6px] rounded-full bg-[#1E3A8A]" />
                    Stage {STAGE_ORDER.indexOf(project.currentStage) + 1} · {project.currentStage.charAt(0) + project.currentStage.slice(1).toLowerCase()}
                  </span>
                )}
                <span className="text-[14px] text-[#8A857C]">by {project.user.name}</span>
              </div>
            </div>

            {/* Awaiting review callout */}
            {pendingReviewCount > 0 && (
              <div className="flex-none self-start rounded-[8px] bg-[#FBF1EA] border border-[#C75D2C]/20 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#C75D2C] text-[13px] font-bold text-white">{pendingReviewCount}</span>
                  <span className="text-[14px] font-semibold text-[#C75D2C]">
                    {pendingReviewCount} file{pendingReviewCount !== 1 ? "s" : ""} awaiting your review
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-8">
            <PortalTabs
              pendingReviewCount={pendingReviewCount}
              isPublished={isPublished}
              overview={
                <div className="grid gap-8 md:grid-cols-[300px_1fr]">
                  {/* Left column — cover + dates */}
                  <div className="space-y-[14px]">
                    <div className="overflow-hidden rounded-[8px] aspect-[2/3] bg-gradient-to-b from-[#1E3A8A]/15 to-[#1E3A8A]/35 flex items-center justify-center">
                      <div className="text-center">
                        {project.coverImageRef ? (
                          <img src={project.coverImageRef} alt={project.bookTitle} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1E3A8A]/50 bg-[#FAF8F4]/80 px-3 py-1 rounded-full">Draft cover</span>
                            <p className="mt-3 font-[family-name:var(--font-display)] text-[15px] text-[#1E3A8A]/60">{project.bookTitle}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="rounded-[8px] border border-[rgba(22,22,22,0.10)] bg-white px-4 py-4">
                      <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#8A857C]">Key dates</h3>
                      <div className="mt-3 space-y-2 text-[14px]">
                        <div className="flex justify-between">
                          <span className="text-[#8A857C]">Submitted</span>
                          <span className="text-[#161616] font-medium">{project.createdAt.toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8A857C]">Expected launch</span>
                          <span className="text-[#161616] font-medium">{project.expectedPubDate ? new Date(project.expectedPubDate).toLocaleDateString() : "TBD"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8A857C]">ISBN</span>
                          <span className="text-[#161616] font-medium">{project.isbn ?? "Assigned at launch"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right column — status note + quick links */}
                  <div className="space-y-[14px]">
                    {project.statusNote && (
                      <div className="rounded-[8px] border border-[rgba(22,22,22,0.10)] bg-white px-5 py-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="h-[7px] w-[7px] rounded-full bg-[#1E3A8A]" />
                          <span className="text-[14px] font-semibold text-[#161616]">
                            Now: {project.currentStage.charAt(0) + project.currentStage.slice(1).toLowerCase()}
                          </span>
                        </div>
                        <p className="font-[family-name:var(--font-display)] text-[17px] leading-[1.55] text-[#55514A]">{project.statusNote}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-[10px]">
                      {[
                        { label: "Track progress", desc: "View your book's production timeline", tab: "progress" },
                        { label: "Review files", desc: `${pendingReviewCount} file${pendingReviewCount !== 1 ? "s" : ""} waiting`, tab: "deliverables", highlight: pendingReviewCount > 0 },
                        { label: "Message the team", desc: "Communication history", tab: "communication" },
                        { label: "View documents", desc: "Formal agreements and files", tab: "documents" },
                      ].map((card) => (
                        <a key={card.tab} href={`?tab=${card.tab}`} className={cn(
                          "rounded-[8px] border px-4 py-4 transition-colors hover:border-[#1E3A8A]/40",
                          card.highlight ? "border-[#C75D2C]/25 bg-[#FBF1EA]" : "border-[rgba(22,22,22,0.10)] bg-white"
                        )}>
                          <div className="text-[14px] font-semibold text-[#161616]">{card.label}</div>
                          <div className="mt-1 text-[12px] text-[#8A857C]">{card.desc}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              }
              progress={
                <ProjectProgress currentStage={project.currentStage} stages={progressStages} />
              }
              deliverables={
                <DeliverablesList
                  deliverables={deliverableItems}
                  grouped={groupedForList}
                  onReview={(id) => {
                    // This is handled client-side — the DeliverablesList is used within a client boundary via PortalTabs
                  }}
                />
              }
              communication={
                <div>
                  <KeyDecisions decisions={pinnedDecisions} />
                  <div className="space-y-4">
                    {project.messages.filter((m) => !m.isPinned).length === 0 && pinnedDecisions.length === 0 && (
                      <p className="py-8 text-center text-[15px] text-[#8A857C]">No messages yet. The team will update you as your project progresses.</p>
                    )}
                    {project.messages.filter((m) => !m.isPinned).map((m) => (
                      <div key={m.id} className="flex gap-3">
                        <div className="mt-1 h-[2px] w-6 flex-none bg-[rgba(22,22,22,0.12)]" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-[#161616]">{m.author.name}</span>
                            <span className="text-[11px] text-[#8A857C]">· {m.authorRole}</span>
                            <span className="text-[11px] text-[#8A857C]">{new Date(m.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="mt-1 text-[14px] leading-[1.6] text-[#55514A]">{m.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              }
              documents={
                <DocumentsList documents={project.documents.map((d) => ({ id: d.id, label: d.label, fileType: d.fileType, uploadedAt: d.uploadedAt.toISOString(), downloadUrl: "#" }))} />
              }
              bookInfo={
                <BookInfoTab
                  isPublished={isPublished}
                  coverImageRef={project.coverImageRef}
                  title={project.bookTitle}
                  isbn={project.isbn}
                  expectedPubDate={project.expectedPubDate?.toISOString()}
                />
              }
            />
          </div>
        </div>
      </div>
    </NarrivaTheme>
  );
}
