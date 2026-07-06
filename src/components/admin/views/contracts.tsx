"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState, SkeletonTableShell } from "@/components/admin/admin-skeleton";

interface Contract {
  id: string;
  templateName: string;
  writerName: string;
  writerSlug: string | null;
  status: "PENDING" | "SIGNED" | "VOIDED" | "EXPIRED" | "DECLINED";
  sentAt: string;
  signedAt: string | null;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[rgba(183,121,31,0.10)] text-[#B7791F]",
  SIGNED: "bg-[rgba(31,138,91,0.10)] text-[#1F8A5B]",
  VOIDED: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
  DECLINED: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
  EXPIRED: "bg-[rgba(20,22,26,0.07)] text-[#8B919A]",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "2-digit" });
}

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "PENDING", label: "Pending" },
  { key: "SIGNED", label: "Signed" },
  { key: "VOIDED", label: "Voided" },
  { key: "EXPIRED", label: "Expired" },
  { key: "DECLINED", label: "Declined" },
];

export function ContractsView() {
  const [items, setItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("PENDING");
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kekere/contracts?status=${filter}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      setItems(d.contracts ?? []);
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

  async function remind(id: string) {
    setActing(id + ":remind");
    try {
      const res = await fetch(`/api/admin/kekere/contracts/${id}/remind`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      showToast("ok", "Reminder sent to writer.");
    } catch {
      showToast("err", "Failed to send reminder.");
    } finally {
      setActing(null);
    }
  }

  async function voidContract(id: string) {
    if (!window.confirm("Void this contract? This cannot be undone.")) return;
    setActing(id + ":void");
    try {
      const res = await fetch(`/api/admin/kekere/contracts/${id}/void`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      setItems((prev) => prev.filter((c) => c.id !== id));
      showToast("ok", "Contract voided.");
    } catch {
      showToast("err", "Failed to void contract.");
    } finally {
      setActing(null);
    }
  }

  const daysPending = (c: Contract) =>
    c.status === "PENDING"
      ? Math.round((Date.now() - new Date(c.sentAt).getTime()) / 86400000)
      : null;

  return (
    <div className="space-y-5">
      {toast && (
        <div className={cn(
          "fixed right-6 top-6 z-50 rounded-[8px] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg",
          toast.type === "ok" ? "bg-[#1F8A5B]" : "bg-[#C0392B]"
        )}>
          {toast.msg}
        </div>
      )}

      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-[9px] bg-[rgba(20,22,26,0.06)] p-[3px]">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "flex-none whitespace-nowrap px-3.5 py-2 text-[12px] font-semibold rounded-[7px] transition-colors",
              filter === f.key ? "bg-white text-[#1A1C20] shadow-sm" : "text-[#8B919A] hover:text-[#1A1C20]"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonTableShell rows={6} cols={5} />
      ) : error ? (
        <AdminViewError message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="No contracts"
          note={`No ${filter.toLowerCase()} contracts to show.`}
        />
      ) : (
        <div className="overflow-x-auto rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
          <div className="grid min-w-[760px] grid-cols-[2fr_2fr_1fr_0.8fr_0.8fr_auto] items-center gap-4 border-b border-[rgba(20,22,26,0.08)] bg-[#FBFBFC] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">
            <span>Writer</span>
            <span>Template</span>
            <span>Status</span>
            <span>Sent</span>
            <span>Days pending</span>
            <span className="text-right">Actions</span>
          </div>

          {items.map((c) => {
            const dp = daysPending(c);
            return (
              <div
                key={c.id}
                className="grid min-w-[760px] grid-cols-[2fr_2fr_1fr_0.8fr_0.8fr_auto] items-center gap-4 border-b border-[rgba(20,22,26,0.05)] px-5 py-4 last:border-0 hover:bg-[#FBFBFC]"
              >
                <p className="truncate text-[13px] font-semibold text-[#1A1C20]">{c.writerName}</p>
                <p className="truncate text-[13px] text-[#1A1C20]">{c.templateName}</p>
                <span className={cn(
                  "w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                  STATUS_STYLES[c.status] ?? STATUS_STYLES.EXPIRED
                )}>
                  {c.status}
                </span>
                <span className="text-[12px] text-[#8B919A]">{fmtDate(c.sentAt)}</span>
                <span className={cn(
                  "text-[12px] font-semibold",
                  dp !== null && dp >= 7 ? "text-[#B7791F]" : "text-[#8B919A]"
                )}>
                  {dp !== null ? `${dp}d` : "—"}
                </span>
                <div className="flex items-center gap-2">
                  {c.status === "PENDING" ? (
                    <>
                      <button
                        type="button"
                        disabled={acting === c.id + ":remind"}
                        onClick={() => remind(c.id)}
                        className="rounded-[7px] border border-[rgba(20,22,26,0.14)] px-3 py-1.5 text-[11px] font-medium text-[#646B73] hover:bg-[#F4F5F7] disabled:opacity-40"
                      >
                        {acting === c.id + ":remind" ? "…" : "Remind"}
                      </button>
                      <button
                        type="button"
                        disabled={acting === c.id + ":void"}
                        onClick={() => voidContract(c.id)}
                        className="rounded-[7px] border border-[#C0392B]/30 px-3 py-1.5 text-[11px] font-medium text-[#C0392B] hover:bg-[rgba(192,57,43,0.06)] disabled:opacity-40"
                      >
                        {acting === c.id + ":void" ? "…" : "Void"}
                      </button>
                    </>
                  ) : c.status === "SIGNED" ? (
                    <span className="text-[11px] text-[#1F8A5B]">
                      Signed {c.signedAt ? fmtDate(c.signedAt) : ""}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#9AA0A8]">No action</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
