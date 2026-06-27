import Link from "next/link";
import { NarrivaTheme } from "@/components/theme";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getSubmissionsForUser } from "@/lib/data/submissions";
import { SubmissionStatusCard } from "@/components/narriva/submission-status-card";
import { AcceptedSubmissionCard } from "@/components/narriva/accepted-submission-card";
import { PortalTabs } from "@/components/narriva/portal-tabs";
import { getAuthorProjects, getAuthorBooks, STAGE_LABELS, TYPE_LABELS } from "@/lib/data/kekere-portal";
import { getAuthorDeliverables } from "@/lib/data/admin-deliverables";
import { getAuthorBookSales } from "@/lib/data/admin-analytics";

export const dynamic = "force-dynamic";

const STAGE_PROGRESS: Record<string, number> = {
  INQUIRY: 0, CONTRACT_SENT: 8, ONBOARDING: 16, MANUSCRIPT_REVIEW: 25,
  DEVELOPMENTAL_EDIT: 33, COPYEDIT: 42, COVER_DESIGN: 50, INTERIOR_TYPESET: 58,
  AUTHOR_REVIEW: 67, PROOFREAD: 75, PRINTING: 83, MARKETING: 92, RELEASED: 100,
};

export default async function AuthorPortalPage() {
  const session = await getCurrentSession();
  const uid = session?.user?.id;
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  const [submissions, projects, books, deliverables, sales] = uid
    ? await Promise.all([
        getSubmissionsForUser(uid),
        getAuthorProjects(uid),
        getAuthorBooks(uid),
        getAuthorDeliverables(uid),
        getAuthorBookSales(uid),
      ])
    : [[], [], [], [], []];

  const preSubmissions = submissions.filter((s) => s.status !== "ACCEPTED");
  const acceptedSubmissions = submissions.filter((s) => s.status === "ACCEPTED");

  const header = (
    <div>
      <div className="mb-3.5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
        Author portal
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-[40px] font-medium tracking-[-0.015em] text-[var(--color-ink)]">
        Welcome back, {firstName}
      </h1>
    </div>
  );

  const hasAnyContent = submissions.length > 0 || projects.length > 0 || books.length > 0;

  return (
    <NarrivaTheme>
      <main>
        <div className="mx-auto max-w-[1080px] px-8 py-14">
          {!hasAnyContent ? (
            <>
              {header}
              <div className="mt-10 rounded-lg border border-[var(--color-ink)]/10 bg-white px-[34px] py-12 text-center">
                <p className="text-[var(--color-muted)]">You haven&apos;t submitted a manuscript yet.</p>
                <Link href="/submit" className={cn(buttonVariants({ size: "lg" }), "mt-5")}>
                  Submit your manuscript
                </Link>
              </div>
            </>
          ) : (
            <PortalTabs
              header={header}
              submissionsView={
                preSubmissions.length === 0 ? (
                  <p className="py-12 text-center text-[var(--color-muted)]">Nothing awaiting a decision right now.</p>
                ) : (
                  <div className="flex flex-col gap-5">
                    {preSubmissions.map((submission) => (
                      <SubmissionStatusCard key={submission.id} submission={submission} />
                    ))}
                  </div>
                )
              }
              productionView={
                <>
                  {deliverables.length > 0 && (
                    <div className="mb-10">
                      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-medium text-[var(--color-ink)]">
                        Files from the team
                      </h2>
                      <div className="flex flex-col gap-3">
                        {deliverables.map((d) => (
                          <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--color-ink)]/10 bg-white p-4">
                            <div>
                              <h4 className="font-medium text-sm">{d.title}</h4>
                              <p className="text-xs text-[var(--color-muted)]">{d.project.title} · {d.type.replace(/_/g, " ")}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${d.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : d.status === "CHANGES_REQUESTED" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>
                                {d.status === "APPROVED" ? "Approved" : d.status === "CHANGES_REQUESTED" ? "Revisions" : "Pending"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {acceptedSubmissions.length === 0 && projects.length === 0 && deliverables.length === 0 ? (
                    <p className="py-12 text-center text-[var(--color-muted)]">Nothing in production yet.</p>
                  ) : (
                    <>
                      {projects.length > 0 && (
                        <div className="mb-10">
                          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-medium text-[var(--color-ink)]">
                            Active projects
                          </h2>
                          <div className="flex flex-col gap-4">
                            {projects.map((project) => (
                              <div
                                key={project.id}
                                className="rounded-lg border border-[var(--color-ink)]/10 bg-white p-5"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="font-semibold text-[var(--color-ink)]">{project.title}</h3>
                                    <p className="text-sm text-[var(--color-muted)]">
                                      {TYPE_LABELS[project.type]}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-[var(--color-bg-alt)] px-3 py-1 text-xs font-medium text-[var(--color-ink)]">
                                    {STAGE_LABELS[project.stage]}
                                  </span>
                                </div>

                                <div className="mt-4 h-[6px] overflow-hidden rounded-full bg-[var(--color-ink)]/8">
                                  <div
                                    className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                                    style={{ width: `${STAGE_PROGRESS[project.stage] ?? 0}%` }}
                                  />
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[var(--color-muted)]">
                                  {Object.entries(STAGE_LABELS).map(([key, label], i) => (
                                    <span
                                      key={key}
                                      className={
                                        Object.keys(STAGE_LABELS).indexOf(project.stage) >= i
                                          ? "font-medium text-[var(--color-ink)]"
                                          : ""
                                      }
                                    >
                                      {label}
                                      {i < Object.keys(STAGE_LABELS).length - 1 && " → "}
                                    </span>
                                  ))}
                                </div>

                                {project.stageNote && (
                                  <div className="mt-3 rounded-md bg-[var(--color-bg-alt)] px-3 py-2 text-sm text-[var(--color-muted)]">
                                    {project.stageNote}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {acceptedSubmissions.length > 0 && (
                        <div>
                          {projects.length > 0 && (
                            <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-medium text-[var(--color-ink)]">
                              In production
                            </h2>
                          )}
                          <div className="flex flex-col gap-10">
                            {acceptedSubmissions.map((submission) => (
                              <AcceptedSubmissionCard
                                key={submission.id}
                                title={submission.manuscriptTitle}
                                currentStage={submission.currentStage ?? "SUBMITTED"}
                                reviewerNotes={submission.reviewerNotes}
                                updates={submission.updates}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              }
              publishedView={
                books.length === 0 ? (
                  <p className="py-12 text-center text-[var(--color-muted)]">No published books yet.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {books.map((book) => (
                      <div
                        key={book.id}
                        className="flex items-center gap-4 rounded-lg border border-[var(--color-ink)]/10 bg-white p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-[var(--color-ink)]">{book.title}</h3>
                          <p className="text-sm text-[var(--color-muted)]">
                            {book.genre} · {book.publishedAt ? new Date(book.publishedAt).getFullYear() : ""}
                          </p>
                        </div>
                        <span className="flex-none rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                          Published
                        </span>
                      </div>
                    ))}
                  </div>
                )
              }
              salesView={
                sales.length === 0 ? (
                  <p className="py-12 text-center text-[var(--color-muted)]">No sales recorded yet.</p>
                ) : (
                  <div>
                    <div className="mb-4 rounded-lg bg-[var(--color-bg-alt)] p-4 text-center">
                      <p className="text-sm text-[var(--color-muted)]">Total revenue</p>
                      <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-ink)]">
                        ₦{sales.reduce((sum, s) => sum + (s.royaltyNgn ?? 0), 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">Your 80% platform share</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      {sales.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--color-ink)]/10 bg-white p-3">
                          <div>
                            <p className="text-sm font-medium">{s.book.title}</p>
                            <p className="text-xs text-[var(--color-muted)]">
                              {new Date(s.saleDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {" · "}{s.saleType}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-[var(--color-success)]">
                            +₦{(s.royaltyNgn ?? 0).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
            />
          )}
        </div>
      </main>
    </NarrivaTheme>
  );
}
