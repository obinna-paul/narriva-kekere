import type { ReactNode } from "react";

interface ProjectProgressProps {
  currentStage: string;
  stages: Array<{
    key: string;
    label: string;
    status: "complete" | "in-progress" | "upcoming";
    completedAt?: string;
    estimatedWeeks?: string | null;
    subSteps?: Array<{ label: string; status: "done" | "in-progress" | "waiting" }>;
  }>;
}

const STAGE_TITLES: Record<string, string> = {
  ASSESSMENT: "Assessment",
  EDITORIAL: "Editorial",
  DESIGN: "Design",
  PRODUCTION: "Production",
  LAUNCHED: "Launch",
};

export function ProjectProgress({ currentStage, stages }: ProjectProgressProps) {
  return (
    <div className="relative">
      {stages.map((s, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === stages.length - 1;
        const isComplete = s.status === "complete";
        const isInProgress = s.status === "in-progress";

        return (
          <div key={s.key} className="relative">
            {/* Vertical connecting line */}
            {!isLast && (
              <div className="absolute left-5 top-12 bottom-0 w-px" style={{ background: isComplete ? "#1E3A8A" : "rgba(22,22,22,0.12)" }} />
            )}

            <div className="flex gap-4 pb-10">
              {/* Node */}
              <div className="relative z-10 flex h-10 w-10 flex-none items-center justify-center rounded-full" style={{
                background: isComplete ? "#1E3A8A" : isInProgress ? "transparent" : "transparent",
                border: isInProgress ? "2px solid #1E3A8A" : isComplete ? "none" : "2px solid rgba(22,22,22,0.12)",
              }}>
                {isComplete ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <span className="text-[14px] font-semibold" style={{ color: isInProgress ? "#1E3A8A" : "rgba(22,22,22,0.25)" }}>{idx + 1}</span>
                )}
              </div>

              {/* Card */}
              <div className="min-w-0 flex-1 rounded-[8px] border p-4" style={{
                background: isInProgress ? "#FAF8F4" : "#FFFFFF",
                borderColor: isInProgress ? "#1E3A8A" : "rgba(22,22,22,0.10)",
              }}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold" style={{ color: isInProgress ? "#161616" : "rgba(22,22,22,0.45)" }}>
                    {STAGE_TITLES[s.key] ?? s.label}
                  </h3>
                  {isComplete && (
                    <span className="flex-none rounded-full bg-[#1F6F4A]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#1F6F4A]">Complete</span>
                  )}
                  {isInProgress && (
                    <span className="flex-none rounded-full bg-[#1E3A8A]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#1E3A8A]">In progress</span>
                  )}
                  {s.status === "upcoming" && (
                    <span className="flex-none rounded-full bg-[rgba(22,22,22,0.06)] px-2.5 py-0.5 text-[11px] font-medium text-[#8A857C]">Upcoming</span>
                  )}
                </div>

                {isComplete && s.completedAt && (
                  <p className="mt-1 text-[13px] text-[#1F6F4A]">Completed {new Date(s.completedAt).toLocaleDateString()}</p>
                )}

                {isInProgress && s.estimatedWeeks && (
                  <p className="mt-1 text-[13px] text-[#55514A]">Estimated: {s.estimatedWeeks}</p>
                )}

                {s.status === "upcoming" && s.estimatedWeeks && (
                  <p className="mt-1 text-[13px] text-[#8A857C]">Estimate: {s.estimatedWeeks}</p>
                )}

                {/* Sub-steps */}
                {s.subSteps && s.subSteps.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {s.subSteps.map((ss) => (
                      <div key={ss.label} className="flex items-center gap-2.5 text-[13px]">
                        <span className="h-[7px] w-[7px] flex-none rounded-full" style={{
                          background: ss.status === "done" ? "#1E3A8A" : ss.status === "in-progress" ? "#C75D2C" : "rgba(22,22,22,0.15)"
                        }} />
                        <span style={{ color: ss.status === "done" ? "#1F6F4A" : ss.status === "in-progress" ? "#161616" : "#8A857C" }}>
                          {ss.label}
                          {ss.status === "done" && " · delivered"}
                          {ss.status === "in-progress" && " · in progress"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
