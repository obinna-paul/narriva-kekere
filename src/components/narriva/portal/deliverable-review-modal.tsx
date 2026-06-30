import { useState } from "react";
import { X, Download } from "lucide-react";

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  deliverable: {
    id: string;
    label: string;
    status: string;
    downloadUrl: string | null;
    versions: Array<{ versionNumber: number; uploadedAt: string; fileType: string }>;
    comments: Array<{ id: string; authorName: string; authorRole: string; body: string; createdAt: string; isKeyDecision: boolean }>;
  } | null;
  onApprove: () => Promise<void>;
  onRequestChanges: (feedback: string) => Promise<void>;
}

export function DeliverableReviewModal({ open, onClose, deliverable, onApprove, onRequestChanges }: ReviewModalProps) {
  const [activeVersion, setActiveVersion] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [approved, setApproved] = useState(false);

  if (!open || !deliverable) return null;

  const currentVersion = deliverable.versions[activeVersion];

  async function handleApprove() {
    setSubmitting(true);
    try {
      await onApprove();
      setApproved(true);
    } catch {}
    setSubmitting(false);
  }

  async function handleRequestChanges() {
    if (!feedback.trim()) return;
    setSubmitting(true);
    try {
      await onRequestChanges(feedback);
      onClose();
    } catch {}
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-[8vh] pb-10">
      <div className="fixed inset-0 bg-[rgba(22,22,22,0.40)]" onClick={onClose} />
      <div className="relative z-10 mx-4 flex w-full max-w-[960px] overflow-hidden rounded-[12px] bg-white shadow-[0_40px_90px_-30px_rgba(22,22,22,0.30)]" style={{ minHeight: 520 }}>
        {/* Left — file preview */}
        <div className="w-[55%] flex-none bg-[#161616] p-6 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-white/60">{deliverable.label}</span>
            <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={18} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center mt-4 mb-4 rounded-[8px] bg-white/10">
            {currentVersion?.fileType?.startsWith("image") ? (
              <div className="text-white/40 text-[14px]">Cover preview</div>
            ) : (
              <div className="text-center text-white/60">
                <p className="text-[15px] font-medium">Document preview</p>
                <p className="mt-2 text-[13px] text-white/40">Download to view full file</p>
                {deliverable.downloadUrl && (
                  <a href={deliverable.downloadUrl} className="mt-3 inline-flex items-center gap-2 rounded-[8px] bg-white/15 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-white/25"><Download size={14} /> Download</a>
                )}
              </div>
            )}
          </div>
          {/* Version selector */}
          {deliverable.versions.length > 1 && (
            <div className="flex items-center gap-2">
              {deliverable.versions.map((v, i) => (
                <button key={v.versionNumber} type="button" onClick={() => setActiveVersion(i)} className="rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-colors" style={{
                  background: i === activeVersion ? "rgba(255,255,255,0.15)" : "transparent",
                  color: i === activeVersion ? "white" : "rgba(255,255,255,0.50)"
                }}>
                  v{v.versionNumber}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right — review panel */}
        <div className="flex flex-1 flex-col min-w-0">
          <div className="px-6 pt-6 pb-4 border-b border-[rgba(22,22,22,0.08)]">
            <h3 className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#161616]">For your review</h3>
            <p className="mt-1 text-[13px] text-[#8A857C]">{deliverable.versions.length > 1 ? `${deliverable.versions.length} versions uploaded` : "1 version uploaded"}</p>
          </div>

          {/* Comment thread */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {deliverable.comments.length === 0 && (
              <p className="text-[13px] text-[#8A857C] py-4">No comments yet.</p>
            )}
            {deliverable.comments.map((c) => (
              <div key={c.id} className="rounded-[8px] border border-[rgba(22,22,22,0.08)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#1E3A8A]/10 text-[11px] font-bold text-[#1E3A8A]">{c.authorName.charAt(0)}</span>
                  <span className="text-[13px] font-semibold text-[#161616]">{c.authorName}</span>
                  <span className="text-[11px] text-[#8A857C]">· {c.authorRole}</span>
                  {c.isKeyDecision && <span className="rounded-full bg-[#B08D57]/15 px-2 py-0.5 text-[10px] font-semibold text-[#9A7B49]">Key decision</span>}
                </div>
                <p className="mt-2 text-[14px] leading-[1.6] text-[#55514A]">{c.body}</p>
                <p className="mt-1 text-[11px] text-[#8A857C]">{new Date(c.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Decision footer */}
          {!approved && deliverable.status === "FOR_REVIEW" && (
            <div className="border-t border-[rgba(22,22,22,0.08)] px-6 py-4 space-y-3">
              {showFeedback && (
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What changes do you need?"
                  rows={3}
                  className="w-full rounded-[8px] border border-[rgba(22,22,22,0.12)] bg-[#FAF8F4] px-4 py-3 text-[14px] text-[#161616] outline-none placeholder:text-[#8A857C]"
                />
              )}
              <div className="flex gap-3">
                {!showFeedback ? (
                  <button type="button" onClick={() => setShowFeedback(true)} className="flex-1 rounded-[8px] border border-[rgba(22,22,22,0.12)] py-2.5 text-[13px] font-medium text-[#55514A] transition-colors hover:bg-[rgba(22,22,22,0.04)]">
                    Request changes
                  </button>
                ) : (
                  <button type="button" onClick={handleRequestChanges} disabled={submitting || !feedback.trim()} className="flex-1 rounded-[8px] bg-[#C75D2C] py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                    Submit change request
                  </button>
                )}
                <button type="button" onClick={handleApprove} disabled={submitting} className="flex-1 rounded-[8px] bg-[#1F6F4A] py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                  Approve this version
                </button>
              </div>
            </div>
          )}

          {approved && (
            <div className="border-t border-[rgba(22,22,22,0.08)] px-6 py-4">
              <div className="flex items-center gap-3 rounded-[8px] bg-[#1F6F4A]/8 px-4 py-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="#1F6F4A"/><path d="M5.5 9l2.5 2.5L12.5 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="text-[14px] font-medium text-[#1F6F4A]">Approved on {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
