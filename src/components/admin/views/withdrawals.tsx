"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState, SkeletonTableShell } from "@/components/admin/admin-skeleton";

interface Withdrawal {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amountCowries: number;
  amountNgn: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED" | "ON_HOLD";
  requestedAt: string;
  processedAt: string | null;
  adminNote: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[rgba(183,121,31,0.10)] text-[#B7791F]",
  PROCESSING: "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]",
  COMPLETED: "bg-[rgba(31,138,91,0.10)] text-[#1F8A5B]",
  REJECTED: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
  ON_HOLD: "bg-[rgba(20,22,26,0.07)] text-[#646B73]",
};

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export function WithdrawalsView() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("PENDING");
  const [acting, setActing] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{ id: string; action: "approve" | "reject" | "hold" } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: filter });
      const res = await fetch(`/api/admin/kekere/withdrawals?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      setItems(d.withdrawals ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function showToast(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function act(id: string, action: "approve" | "reject" | "hold", note: string) {
    setActing(id);
    const endpoint = `/api/admin/kekere/withdrawals/${id}/${action === "hold" ? "hold" : action === "reject" ? "reject" : "approve"}`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Failed");
      setItems((prev) => prev.filter((w) => w.id !== id));
      showToast("ok", action === "approve" ? "Withdrawal approved." : action === "reject" ? "Withdrawal rejected." : "Withdrawal put on hold.");
    } catch {
      showToast("err", "Action failed. Try again.");
    } finally {
      setActing(null);
      setNoteModal(null);
      setNoteText("");
    }
  }

  const FILTERS = ["PENDING", "PROCESSING", "ON_HOLD", "COMPLETED", "REJECTED"];

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed right-6 top-6 z-50 rounded-[8px] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg",
          toast.type === "ok" ? "bg-[#1F8A5B]" : "bg-[#C0392B]"
        )}>
          {toast.msg}
        </div>
      )}

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(20,22,26,0.4)] backdrop-blur-sm">
          <div className="w-[420px] rounded-[13px] bg-white p-6 shadow-xl">
            <h3 className="text-[15px] font-semibold text-[#1A1C20] capitalize">
              {noteModal.action === "hold" ? "Put on hold" : noteModal.action} withdrawal
            </h3>
            <p className="mt-1 text-[13px] text-[#8B919A]">
              {noteModal.action === "approve"
                ? "This will trigger a Paystack Transfer. Confirm only when ready."
                : noteModal.action === "reject"
                ? "Cowries will be refunded to the writer's balance."
                : "The request will be paused pending further review."}
            </p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note (optional)…"
              rows={3}
              className="mt-4 w-full resize-none rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-[#F4F5F7] px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#1A1C20]/30"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => { setNoteModal(null); setNoteText(""); }}
                className="flex-1 rounded-[8px] border border-[rgba(20,22,26,0.14)] py-2.5 text-[13px] font-medium text-[#646B73] hover:bg-[#F4F5F7]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!acting}
                onClick={() => act(noteModal.id, noteModal.action, noteText)}
                className={cn(
                  "flex-1 rounded-[8px] py-2.5 text-[13px] font-semibold text-white disabled:opacity-40",
                  noteModal.action === "approve" ? "bg-[#1F8A5B] hover:bg-[#1a7a50]" : noteModal.action === "reject" ? "bg-[#C0392B]" : "bg-[#646B73]"
                )}
              >
                {acting ? "Processing…" : noteModal.action === "approve" ? "Confirm & pay" : noteModal.action === "reject" ? "Reject & refund" : "Put on hold"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-[9px] bg-[rgba(20,22,26,0.06)] p-[3px] w-fit">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 text-[12px] font-semibold capitalize rounded-[7px] transition-colors",
              filter === f ? "bg-white text-[#1A1C20] shadow-sm" : "text-[#8B919A] hover:text-[#1A1C20]"
            )}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonTableShell rows={7} cols={6} />
      ) : error ? (
        <AdminViewError message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <AdminEmptyState title={`No ${filter.toLowerCase().replace("_", " ")} withdrawals`} note="All clear here — nothing to action." />
      ) : (
        <div className="overflow-hidden rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
          {/* Header */}
          <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_0.8fr_auto] items-center gap-4 border-b border-[rgba(20,22,26,0.08)] bg-[#FBFBFC] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">
            <span>Writer</span>
            <span>Bank</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Requested</span>
            <span className="text-right">Actions</span>
          </div>

          {items.map((w) => (
            <div
              key={w.id}
              className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_0.8fr_auto] items-center gap-4 border-b border-[rgba(20,22,26,0.05)] px-5 py-4 last:border-0 hover:bg-[#FBFBFC]"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#1A1C20]">{w.userName}</p>
                <p className="truncate text-[11px] text-[#8B919A]">{w.userEmail}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-[#1A1C20]">{w.bankName}</p>
                <p className="font-mono text-[11px] text-[#9AA0A8]">{w.bankAccountNumber}</p>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#1A1C20]">₦{w.amountNgn.toLocaleString()}</p>
                <p className="text-[11px] text-[#8B919A]">{w.amountCowries.toLocaleString()} ₵</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase w-fit", STATUS_STYLES[w.status] ?? STATUS_STYLES.PENDING)}>
                {w.status.replace("_", " ")}
              </span>
              <span className="text-[12px] text-[#8B919A]">{relativeTime(w.requestedAt)}</span>
              <div className="flex items-center gap-2">
                {w.status === "PENDING" || w.status === "ON_HOLD" ? (
                  <>
                    <button
                      type="button"
                      disabled={acting === w.id}
                      onClick={() => setNoteModal({ id: w.id, action: "approve" })}
                      className="rounded-[7px] bg-[#1F8A5B] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1a7a50] disabled:opacity-40"
                    >
                      Pay
                    </button>
                    <button
                      type="button"
                      disabled={acting === w.id}
                      onClick={() => setNoteModal({ id: w.id, action: "hold" })}
                      className="rounded-[7px] border border-[rgba(20,22,26,0.14)] px-3 py-1.5 text-[11px] font-medium text-[#646B73] hover:bg-[#F4F5F7] disabled:opacity-40"
                    >
                      Hold
                    </button>
                    <button
                      type="button"
                      disabled={acting === w.id}
                      onClick={() => setNoteModal({ id: w.id, action: "reject" })}
                      className="rounded-[7px] border border-[#C0392B]/30 px-3 py-1.5 text-[11px] font-medium text-[#C0392B] hover:bg-[rgba(192,57,43,0.06)] disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-[#9AA0A8]">{w.processedAt ? relativeTime(w.processedAt) : "—"}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
