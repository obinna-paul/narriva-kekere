"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState } from "@/components/admin/admin-skeleton";

interface Project {
  id: string;
  bookTitle: string;
  authorName: string;
  currentStage: "ASSESSMENT" | "EDITORIAL" | "DESIGN" | "PRODUCTION" | "LAUNCHED";
  pendingAuthorActions: number;
  pendingAdminActions: number;
  daysInCurrentStage: number;
  createdAt: string;
}

const STAGES: Project["currentStage"][] = ["ASSESSMENT", "EDITORIAL", "DESIGN", "PRODUCTION", "LAUNCHED"];

const STAGE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  ASSESSMENT: { bg: "#F4F5F7", border: "rgba(20,22,26,0.12)", label: "#646B73" },
  EDITORIAL: { bg: "#E8EEFF", border: "rgba(30,58,138,0.18)", label: "#1E3A8A" },
  DESIGN: { bg: "rgba(107,33,168,0.07)", border: "rgba(107,33,168,0.18)", label: "#6B21A8" },
  PRODUCTION: { bg: "rgba(183,121,31,0.07)", border: "rgba(183,121,31,0.2)", label: "#B7791F" },
  LAUNCHED: { bg: "rgba(31,138,91,0.07)", border: "rgba(31,138,91,0.2)", label: "#1F8A5B" },
};


export function AuthorProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/narriva/projects");
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      setProjects(d.projects ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function advanceStage(project: Project) {
    const idx = STAGES.indexOf(project.currentStage);
    if (idx >= STAGES.length - 1) return;
    const nextStage = STAGES[idx + 1];
    setMovingId(project.id);
    try {
      const res = await fetch(`/api/admin/narriva/projects/${project.id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });
      if (!res.ok) throw new Error("Failed");
      setProjects((prev) => prev.map((p) => p.id === project.id ? { ...p, currentStage: nextStage } : p));
      showToast("ok", `Moved to ${nextStage.toLowerCase()}.`);
    } catch {
      showToast("err", "Failed to advance stage.");
    } finally {
      setMovingId(null);
    }
  }

  const byStage = STAGES.reduce<Record<string, Project[]>>((acc, s) => {
    acc[s] = projects.filter((p) => p.currentStage === s);
    return acc;
  }, {} as Record<string, Project[]>);

  if (loading) {
    return (
      <div className="flex gap-4">
        {STAGES.map((s) => (
          <div key={s} className="w-[220px] flex-none space-y-3">
            <div className="h-5 w-24 animate-pulse rounded bg-[rgba(20,22,26,0.07)]" />
            {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-[120px] animate-pulse rounded-[11px] bg-[rgba(20,22,26,0.07)]" />)}
          </div>
        ))}
      </div>
    );
  }

  if (error) return <AdminViewError message={error} onRetry={load} />;

  if (projects.length === 0) return <AdminEmptyState title="No active projects" note="Accepted submissions will appear here as author projects." />;

  return (
    <div className="relative">
      {toast && (
        <div className={cn("fixed right-6 top-6 z-50 rounded-[8px] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg", toast.type === "ok" ? "bg-[#1F8A5B]" : "bg-[#C0392B]")}>
          {toast.msg}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const c = STAGE_COLORS[stage];
          const cols = byStage[stage] ?? [];
          return (
            <div key={stage} className="w-[240px] flex-none">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: c.label }}>
                  {stage}
                </span>
                {cols.length > 0 && (
                  <span className="rounded-full bg-[rgba(20,22,26,0.08)] px-2 py-0.5 text-[10px] font-bold text-[#646B73]">{cols.length}</span>
                )}
              </div>

              <div className="space-y-3 min-h-[200px]">
                {cols.length === 0 ? (
                  <div className="flex h-[80px] items-center justify-center rounded-[11px] border border-dashed border-[rgba(20,22,26,0.12)] text-[12px] text-[#9AA0A8]">
                    Empty
                  </div>
                ) : (
                  cols.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-[11px] border p-4 transition-shadow hover:shadow-sm"
                      style={{ background: c.bg, borderColor: c.border }}
                    >
                      <p className="line-clamp-2 text-[13px] font-semibold text-[#1A1C20]">{p.bookTitle}</p>
                      <p className="mt-1 text-[11px] text-[#8B919A]">by {p.authorName}</p>

                      <div className="mt-3 space-y-1.5">
                        {p.pendingAuthorActions > 0 && (
                          <div className="rounded-[6px] bg-[rgba(183,121,31,0.12)] px-2 py-1">
                            <p className="text-[10px] font-semibold text-[#B7791F]">⚡ {p.pendingAuthorActions} author action{p.pendingAuthorActions !== 1 ? "s" : ""} pending</p>
                          </div>
                        )}
                        {p.pendingAdminActions > 0 && (
                          <p className="text-[11px] text-[#1E3A8A]">{p.pendingAdminActions} deliverable{p.pendingAdminActions !== 1 ? "s" : ""} to review</p>
                        )}
                        <p className="text-[11px] text-[#9AA0A8]">{p.daysInCurrentStage}d in this stage</p>
                      </div>

                      {stage !== "LAUNCHED" && (
                        <button
                          type="button"
                          disabled={movingId === p.id}
                          onClick={() => advanceStage(p)}
                          className="mt-3 w-full rounded-[7px] border border-[rgba(20,22,26,0.12)] bg-white py-1.5 text-[11px] font-semibold text-[#1A1C20] hover:bg-[#F4F5F7] disabled:opacity-40"
                        >
                          {movingId === p.id ? "Moving…" : `→ ${STAGES[STAGES.indexOf(stage) + 1]?.toLowerCase()}`}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
