"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState, SkeletonTableShell } from "@/components/admin/admin-skeleton";

interface Withdrawal {
  id: string;
  userName: string;
  userEmail: string;
  cowriesAmount: number;
  ngnAmount: number;
  bankDetails: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    verifiedAt: string | null;
  };
  status: "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED" | "FAILED";
  requestedAt: string;
  processedAt: string | null;
  adminNote: string | null;
}

type Action = "approve" | "reject" | "hold" | "mark-paid" | "mark-failed" | "revert";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[rgba(183,121,31,0.10)] text-[#B7791F]",
  APPROVED: "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]",
  PROCESSING: "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]",
  COMPLETED: "bg-[rgba(31,138,91,0.10)] text-[#1F8A5B]",
  REJECTED: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
  FAILED: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
};

const ENDPOINT: Record<Action, string> = {
  approve: "approve",
  reject: "reject",
  hold: "hold",
  "mark-paid": "mark-paid",
  "mark-failed": "mark-failed",
  revert: "revert",
};

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-[8px] bg-[#F4F5F7] px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">{label}</p>
        <p className="truncate text-[13px] font-medium text-[#1A1C20]">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className={cn(
          "flex-none rounded-[6px] px-2.5 py-1 text-[11px] font-semibold transition-colors",
          copied ? "bg-[#1F8A5B] text-white" : "bg-white text-[#646B73] hover:text-[#1A1C20] border border-[rgba(20,22,26,0.12)]"
        )}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function WithdrawalsView() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("PENDING");
  const [acting, setActing] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{ item: Withdrawal; action: Action } | null>(null);
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
      setItems(d.requests ?? []);
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

  async function act(id: string, action: Action, note: string) {
    setActing(id);
    const endpoint = `/api/admin/kekere/withdrawals/${id}/${ENDPOINT[action]}`;
    const body =
      action === "reject" ? { reason: note }
      : action === "hold" ? { note }
      : action === "mark-paid" ? { reference: note }
      : action === "mark-failed" ? { reason: note }
      : {};
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? data?.error ?? "Failed");
      setItems((prev) => prev.filter((w) => w.id !== id));
      const messages: Record<Action, string> = {
        approve: "Withdrawal approved — send the transfer, then mark it paid.",
        reject: "Withdrawal rejected.",
        hold: "Withdrawal put on hold.",
        "mark-paid": "Withdrawal marked as paid.",
        "mark-failed": "Withdrawal marked as failed — balance restored.",
        revert: "Reverted to pending.",
      };
      showToast("ok", messages[action]);
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Action failed. Try again.");
    } finally {
      setActing(null);
      setNoteModal(null);
      setNoteText("");
    }
  }

  // "ON_HOLD" isn't a real status — a held request stays PENDING with an
  // adminNote attached (see the /hold endpoint), surfaced as a badge below
  // rather than a separate, always-empty filter tab.
  const FILTERS = ["PENDING", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED", "FAILED"];

  const NEEDS_TEXT: Action[] = ["reject", "mark-paid", "mark-failed"];
  const modalCopy: Record<Action, { title: string; desc: string; placeholder?: string; confirmLabel: string; confirmClass: string }> = {
    approve: {
      title: "Approve withdrawal",
      desc: "Marks this request approved. You'll then send the payment yourself from your bank app and record it as paid — Kekere can't send this automatically yet.",
      confirmLabel: "Approve",
      confirmClass: "bg-[#1F8A5B] hover:bg-[#1a7a50]",
    },
    reject: {
      title: "Reject withdrawal",
      desc: "Cowries will be refunded to the writer's balance.",
      placeholder: "Reason for rejection (required)…",
      confirmLabel: "Reject & refund",
      confirmClass: "bg-[#C0392B]",
    },
    hold: {
      title: "Put on hold",
      desc: "The request will be paused pending further review.",
      placeholder: "Add a note (optional)…",
      confirmLabel: "Put on hold",
      confirmClass: "bg-[#646B73]",
    },
    "mark-paid": {
      title: "Mark as paid",
      desc: "Confirm you've already sent the transfer, then record the bank's reference number for the record.",
      placeholder: "Transaction reference (required)…",
      confirmLabel: "Mark as paid",
      confirmClass: "bg-[#1F8A5B] hover:bg-[#1a7a50]",
    },
    "mark-failed": {
      title: "Mark as failed",
      desc: "Use this if the transfer didn't go through (wrong account, bank error, etc). The cowries are returned to the writer's balance immediately.",
      placeholder: "What went wrong? (required)…",
      confirmLabel: "Mark as failed",
      confirmClass: "bg-[#C0392B]",
    },
    revert: {
      title: "Revert to pending",
      desc: "Moves this back to Pending review. Nothing has been paid, so no balance changes.",
      confirmLabel: "Revert",
      confirmClass: "bg-[#646B73]",
    },
  };

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
      {noteModal && (() => {
        const copy = modalCopy[noteModal.action];
        const needsText = NEEDS_TEXT.includes(noteModal.action);
        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(20,22,26,0.4)] backdrop-blur-sm">
            <div className="w-[440px] rounded-[13px] bg-white p-6 shadow-xl">
              <h3 className="text-[15px] font-semibold text-[#1A1C20]">{copy.title}</h3>
              <p className="mt-1 text-[13px] text-[#8B919A]">{copy.desc}</p>

              {(noteModal.action === "mark-paid" || noteModal.action === "mark-failed" || noteModal.action === "approve") && (
                <div className="mt-4 space-y-2">
                  <CopyField label="Account number" value={noteModal.item.bankDetails.accountNumber} />
                  <CopyField label="Bank" value={noteModal.item.bankDetails.bankName} />
                  <CopyField label="Account name" value={noteModal.item.bankDetails.accountName} />
                  <CopyField label="Amount" value={`₦${noteModal.item.ngnAmount.toLocaleString()}`} />
                  {!noteModal.item.bankDetails.verifiedAt && (
                    <p className="text-[11px] font-medium text-[#B7791F]">
                      ⚠ This account name hasn&apos;t been verified by Paystack — double-check it by eye before sending.
                    </p>
                  )}
                </div>
              )}

              {copy.placeholder && (
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={copy.placeholder}
                  rows={3}
                  className="mt-4 w-full resize-none rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-[#F4F5F7] px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#1A1C20]/30"
                />
              )}

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
                  disabled={!!acting || (needsText && !noteText.trim())}
                  onClick={() => act(noteModal.item.id, noteModal.action, noteText)}
                  className={cn(
                    "flex-1 rounded-[8px] py-2.5 text-[13px] font-semibold text-white disabled:opacity-40",
                    copy.confirmClass
                  )}
                >
                  {acting ? "Processing…" : copy.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Filter tabs */}
      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-[9px] bg-[rgba(20,22,26,0.06)] p-[3px]">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "flex-none whitespace-nowrap px-4 py-2 text-[12px] font-semibold capitalize rounded-[7px] transition-colors",
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
        <div className="overflow-x-auto rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
          {/* Header */}
          <div className="grid min-w-[820px] grid-cols-[2fr_1.7fr_1.5fr_1fr_0.8fr_auto] items-center gap-4 border-b border-[rgba(20,22,26,0.08)] bg-[#FBFBFC] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">
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
              className="grid min-w-[820px] grid-cols-[2fr_1.7fr_1.5fr_1fr_0.8fr_auto] items-center gap-4 border-b border-[rgba(20,22,26,0.05)] px-5 py-4 last:border-0 hover:bg-[#FBFBFC]"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#1A1C20]">{w.userName}</p>
                <p className="truncate text-[11px] text-[#8B919A]">{w.userEmail}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-[#1A1C20]">{w.bankDetails.bankName}</p>
                <p className="font-mono text-[11px] text-[#9AA0A8]">{w.bankDetails.accountNumber}</p>
                <p className="truncate text-[11px] text-[#9AA0A8]">{w.bankDetails.accountName}</p>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#1A1C20]">₦{w.ngnAmount.toLocaleString()}</p>
                <p className="text-[11px] text-[#8B919A]">{w.cowriesAmount.toLocaleString()} ₵</p>
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase w-fit", STATUS_STYLES[w.status] ?? STATUS_STYLES.PENDING)}>
                  {w.status.replace("_", " ")}
                </span>
                {w.status === "PENDING" && w.adminNote && (
                  <span
                    title={w.adminNote}
                    className="rounded-full bg-[rgba(20,22,26,0.07)] px-2.5 py-1 text-[10px] font-bold uppercase text-[#646B73] w-fit"
                  >
                    On hold
                  </span>
                )}
              </div>
              <span className="text-[12px] text-[#8B919A]">{relativeTime(w.requestedAt)}</span>
              <div className="flex items-center justify-end gap-2">
                {w.status === "PENDING" ? (
                  <>
                    <button
                      type="button"
                      disabled={acting === w.id}
                      onClick={() => { setNoteModal({ item: w, action: "approve" }); setNoteText(""); }}
                      className="rounded-[7px] bg-[#1F8A5B] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1a7a50] disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={acting === w.id}
                      onClick={() => { setNoteModal({ item: w, action: "hold" }); setNoteText(""); }}
                      className="rounded-[7px] border border-[rgba(20,22,26,0.14)] px-3 py-1.5 text-[11px] font-medium text-[#646B73] hover:bg-[#F4F5F7] disabled:opacity-40"
                    >
                      Hold
                    </button>
                    <button
                      type="button"
                      disabled={acting === w.id}
                      onClick={() => { setNoteModal({ item: w, action: "reject" }); setNoteText(""); }}
                      className="rounded-[7px] border border-[#C0392B]/30 px-3 py-1.5 text-[11px] font-medium text-[#C0392B] hover:bg-[rgba(192,57,43,0.06)] disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </>
                ) : w.status === "APPROVED" || w.status === "PROCESSING" ? (
                  <>
                    <button
                      type="button"
                      disabled={acting === w.id}
                      onClick={() => { setNoteModal({ item: w, action: "mark-paid" }); setNoteText(""); }}
                      className="rounded-[7px] bg-[#1F8A5B] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1a7a50] disabled:opacity-40"
                    >
                      Mark as paid
                    </button>
                    <button
                      type="button"
                      disabled={acting === w.id}
                      onClick={() => { setNoteModal({ item: w, action: "mark-failed" }); setNoteText(""); }}
                      className="rounded-[7px] border border-[#C0392B]/30 px-3 py-1.5 text-[11px] font-medium text-[#C0392B] hover:bg-[rgba(192,57,43,0.06)] disabled:opacity-40"
                    >
                      Failed
                    </button>
                    <button
                      type="button"
                      disabled={acting === w.id}
                      onClick={() => { setNoteModal({ item: w, action: "revert" }); setNoteText(""); }}
                      className="rounded-[7px] border border-[rgba(20,22,26,0.14)] px-3 py-1.5 text-[11px] font-medium text-[#646B73] hover:bg-[#F4F5F7] disabled:opacity-40"
                    >
                      Revert
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
