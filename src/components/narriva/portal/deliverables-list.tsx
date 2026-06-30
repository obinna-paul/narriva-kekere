import { cn } from "@/lib/utils/cn";

interface DeliverableItem {
  id: string;
  label: string;
  stage: string;
  status: "DRAFT" | "FOR_REVIEW" | "CHANGES_REQUESTED" | "APPROVED";
  uploadedBy: string;
  createdAt: string;
  latestVersion?: {
    versionNumber: number;
    fileType: string;
  };
  commentCount: number;
}

const FILE_ICONS: Record<string, { bg: string; color: string; label: string }> = {
  "application/pdf": { bg: "rgba(195,57,43,0.10)", color: "#C3392B", label: "PDF" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { bg: "rgba(30,58,138,0.10)", color: "#1E3A8A", label: "DOCX" },
  "application/epub+zip": { bg: "rgba(31,111,74,0.10)", color: "#1F6F4A", label: "EPUB" },
  "image/png": { bg: "rgba(154,123,73,0.10)", color: "#9A7B49", label: "IMG" },
  "image/jpeg": { bg: "rgba(154,123,73,0.10)", color: "#9A7B49", label: "IMG" },
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-[rgba(22,22,22,0.06)] text-[#8A857C]",
  FOR_REVIEW: "bg-[rgba(199,93,44,0.10)] text-[#C75D2C]",
  CHANGES_REQUESTED: "bg-[rgba(183,121,31,0.10)] text-[#B7791F]",
  APPROVED: "bg-[#1F6F4A]/10 text-[#1F6F4A]",
};

export function DeliverablesList({
  deliverables,
  grouped,
  onReview,
}: {
  deliverables: DeliverableItem[];
  grouped: Record<string, DeliverableItem[]>;
  onReview: (id: string) => void;
}) {
  const stageOrder = ["EDITORIAL", "DESIGN", "PRODUCTION", "LAUNCHED"];

  if (deliverables.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] text-[#8A857C]">No deliverables yet.</p>
        <p className="mt-1 text-[13px] text-[#8A857C]/70">Files will appear here as your project progresses through editing and design.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {stageOrder.map((stage) => {
        const items = grouped[stage];
        if (!items || items.length === 0) return null;

        return (
          <div key={stage}>
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#8A857C]">{stage.charAt(0) + stage.slice(1).toLowerCase()}</h3>
            <div className="space-y-[10px]">
              {items.map((d) => {
                const ft = d.latestVersion?.fileType;
                const icon = FILE_ICONS[ft ?? ""] ?? { bg: "rgba(22,22,22,0.08)", color: "#55514A", label: (ft ?? "DOC").toUpperCase() };

                return (
                  <div
                    key={d.id}
                    className={cn(
                      "flex items-center gap-4 rounded-[8px] border bg-white px-4 py-4 transition-colors",
                      d.status === "FOR_REVIEW" ? "border-[#C75D2C]/30" : "border-[rgba(22,22,22,0.10)]"
                    )}
                  >
                    {/* File type tile */}
                    <div className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-[6px] text-[13px] font-bold" style={{ background: icon.bg, color: icon.color }}>
                      {icon.label}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-medium text-[#161616]">{d.label}</span>
                        {d.latestVersion && (
                          <span className="flex-none rounded-full bg-[rgba(22,22,22,0.06)] px-2 py-0.5 text-[11px] font-medium text-[#8A857C]">v{d.latestVersion.versionNumber}</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[12px] text-[#8A857C]">
                        {d.uploadedBy} · {new Date(d.createdAt).toLocaleDateString()}
                        {d.commentCount > 0 && <> · {d.commentCount} comment{d.commentCount !== 1 ? "s" : ""}</>}
                      </div>
                    </div>

                    <span className={cn("flex-none rounded-full px-3 py-1 text-[11px] font-semibold", STATUS_STYLES[d.status])}>
                      {d.status === "CHANGES_REQUESTED" ? "Changes Requested" : d.status === "FOR_REVIEW" ? "For Review" : d.status === "APPROVED" ? "Approved" : "Draft"}
                    </span>

                    {d.status === "FOR_REVIEW" && (
                      <button
                        type="button"
                        onClick={() => onReview(d.id)}
                        className="flex-none rounded-[8px] border border-[#1E3A8A] px-4 py-2 text-[13px] font-semibold text-[#1E3A8A] transition-colors hover:bg-[#1E3A8A]/5"
                      >
                        Review
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
