"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, SkeletonKpiCard, SkeletonChart } from "@/components/admin/admin-skeleton";
import { AdjustCowriesModal, type CowrieWalletType } from "@/components/admin/adjust-cowries-modal";

interface EconomyOverview {
  reconciliation: {
    totalIssued: number;
    totalFromTopUps: number;
    totalFromReferralRewards: number;
    totalFromAdminAdjustments: number;
    totalInSpendingWallets: number;
    totalInEarnedWallets: number;
    totalSpentOnUnlocks: number;
    totalWithdrawnCowries: number;
    totalPlatformEarned: number;
    totalUntrackedBalance: number;
    balanced: boolean;
    equation: { left: number; right: number; difference: number };
  };
}

interface TimeseriesPoint {
  date: string;
  issued: number;
  spent: number;
  withdrawn: number;
}

interface WalletAuditRow {
  walletId: string;
  userId: string;
  email: string;
  name: string;
  spendingDiff: number;
  earnedDiff: number;
  totalDiff: number;
}

function AreaChart({ data, keys }: { data: TimeseriesPoint[]; keys: Array<{ key: keyof TimeseriesPoint; color: string; label: string }> }) {
  if (data.length === 0) return <div className="flex h-[120px] items-center justify-center text-[12px] text-[#9AA0A8]">No data</div>;
  const w = 600; const h = 120;
  const pad = { l: 40, r: 8, t: 8, b: 20 };
  const cw = w - pad.l - pad.r; const ch = h - pad.t - pad.b;
  const vals = data.flatMap((d) => keys.map((k) => Number(d[k.key]) || 0));
  const maxVal = Math.max(...vals, 1);
  const pts = (key: keyof TimeseriesPoint) =>
    data.map((d, i) => `${pad.l + (i / (data.length - 1)) * cw},${pad.t + ch - ((Number(d[key]) || 0) / maxVal) * ch}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full">
      {[0, maxVal / 2, maxVal].map((v, vi) => (
        <g key={vi}>
          <line x1={pad.l} x2={w - pad.r} y1={pad.t + ch - (v / maxVal) * ch} y2={pad.t + ch - (v / maxVal) * ch} stroke="rgba(20,22,26,0.05)" strokeWidth="0.5" />
          <text x={pad.l - 4} y={pad.t + ch - (v / maxVal) * ch + 4} textAnchor="end" fill="#9AA0A8" fontSize="9">{(v / 1000).toFixed(0)}k</text>
        </g>
      ))}
      {keys.map((k) => (
        <polyline key={k.key as string} points={pts(k.key)} fill="none" stroke={k.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

const RECONCILIATION_ITEMS = [
  { key: "totalIssued", label: "Total issued", accent: "#1A1C20" },
  { key: "totalInSpendingWallets", label: "Reader wallets", accent: "#1E3A8A" },
  { key: "totalInEarnedWallets", label: "Writer wallets (earnable)", accent: "#C75D2C" },
  { key: "totalSpentOnUnlocks", label: "Spent on unlocks", accent: "#1F8A5B" },
  { key: "totalWithdrawnCowries", label: "Withdrawn", accent: "#B7791F" },
  { key: "totalPlatformEarned", label: "Platform earnings", accent: "#6B21A8" },
] as const;

export function CowrieEconomy() {
  const [overview, setOverview] = useState<EconomyOverview | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [auditRows, setAuditRows] = useState<WalletAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState("30d");
  const [fixing, setFixing] = useState<{ row: WalletAuditRow; wallet: CowrieWalletType } | null>(null);
  const [clearingAdmins, setClearingAdmins] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, tsRes, auditRes] = await Promise.all([
        fetch("/api/admin/kekere/economy/overview"),
        fetch(`/api/admin/kekere/economy/timeseries?range=${range}`),
        fetch("/api/admin/kekere/economy/wallet-audit"),
      ]);
      if (!ovRes.ok || !tsRes.ok) throw new Error("Failed to load economy data");
      const [ov, ts] = await Promise.all([ovRes.json(), tsRes.json()]);
      setOverview(ov);
      setTimeseries(ts.data ?? []);
      if (auditRes.ok) {
        const audit = await auditRes.json();
        setAuditRows(audit.rows ?? []);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  async function handleClearAdminCowries() {
    const confirmed = window.confirm(
      "Zero out every admin account's SPENDING balance only — earned/withdrawable balances are never touched. This can't be undone. Each wallet gets a logged ADMIN_DEBIT transaction."
    );
    if (!confirmed) return;

    setClearingAdmins(true);
    setClearResult(null);
    try {
      const res = await fetch("/api/admin/kekere/economy/clear-admin-cowries", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to clear admin cowries");
      const cleared = data.cleared ?? [];
      setClearResult(
        cleared.length === 0
          ? "No admin accounts had a nonzero balance."
          : `Cleared ${cleared.length} admin account${cleared.length === 1 ? "" : "s"}: ${cleared
              .map((c: { name: string }) => c.name)
              .join(", ")}.`
      );
      load();
    } catch (e) {
      setClearResult(e instanceof Error ? e.message : "Failed to clear admin cowries");
    } finally {
      setClearingAdmins(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-7">
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonKpiCard key={i} />)}</div>
        <SkeletonChart />
      </div>
    );
  }

  if (error) return <AdminViewError message={error} onRetry={load} />;

  const rec = overview?.reconciliation;
  const isBalanced = rec?.balanced ?? false;

  return (
    <div className="space-y-7">
      {/* Balance status banner */}
      <div className={cn(
        "flex items-center gap-3 rounded-[11px] border px-5 py-4",
        isBalanced
          ? "border-[#1F8A5B]/20 bg-[rgba(31,138,91,0.06)]"
          : "border-[#C0392B]/20 bg-[rgba(192,57,43,0.06)]"
      )}>
        <span className="text-[20px]">{isBalanced ? "✓" : "⚠"}</span>
        <div>
          <p className={cn("text-[14px] font-semibold", isBalanced ? "text-[#1F8A5B]" : "text-[#C0392B]")}>
            {isBalanced ? "Economy is balanced" : "Economy imbalance detected"}
          </p>
          {!isBalanced && rec && (
            <p className="text-[12px] text-[#C0392B]/80">
              Delta: {rec.equation.difference.toLocaleString()} ₵.{" "}
              {Math.abs(rec.totalUntrackedBalance) > 1
                ? `${Math.abs(rec.totalUntrackedBalance).toLocaleString()} ₵ of that is untracked wallet balance — not backed by any transaction. See below.`
                : "Investigate before issuing more cowries."}
            </p>
          )}
        </div>
      </div>

      {/* Untracked balance — a data-integrity signal distinct from the admin's
          own (deliberately excluded) test balance. */}
      {rec && Math.abs(rec.totalUntrackedBalance) > 1 && (
        <div className="flex items-center gap-3 rounded-[11px] border border-[#B7791F]/25 bg-[rgba(183,121,31,0.06)] px-5 py-4">
          <span className="text-[20px]">◆</span>
          <div>
            <p className="text-[14px] font-semibold text-[#B7791F]">Untracked wallet balance</p>
            <p className="text-[12px] text-[#B7791F]/85">
              {rec.totalUntrackedBalance.toLocaleString()} ₵ sitting in reader/writer wallets has no matching
              transaction — likely leftover from before the spending/earned wallet split, or a direct
              database edit. Real activity always nets to zero here.
            </p>
          </div>
        </div>
      )}

      {/* Which specific wallets carry the untracked balance. */}
      {auditRows.length > 0 && (
        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
          <h3 className="mb-1 text-[13px] font-semibold text-[#1A1C20]">Flagged wallets</h3>
          <p className="mb-4 text-[12px] text-[#8B919A]">
            Accounts whose stored balance doesn&apos;t match what their own transaction history says it should be.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-[13px]">
              <thead>
                <tr className="border-b border-[rgba(20,22,26,0.08)] text-left text-[11px] uppercase tracking-[0.04em] text-[#9AA0A8]">
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 text-right font-medium">Spending diff</th>
                  <th className="pb-2 text-right font-medium">Earned diff</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                  <th className="pb-2 text-right font-medium">Reconcile</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((row) => (
                  <tr key={row.walletId} className="border-b border-[rgba(20,22,26,0.05)] last:border-0">
                    <td className="py-2">
                      <div className="font-medium text-[#1A1C20]">{row.name}</div>
                      <div className="text-[11px] text-[#8B919A]">{row.email}</div>
                    </td>
                    <td className="py-2 text-right tabular-nums text-[#1A1C20]">{row.spendingDiff.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums text-[#1A1C20]">{row.earnedDiff.toLocaleString()}</td>
                    <td className="py-2 text-right font-semibold tabular-nums text-[#C0392B]">{row.totalDiff.toLocaleString()}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        {Math.abs(row.spendingDiff) > 1 && (
                          <button
                            type="button"
                            onClick={() => setFixing({ row, wallet: "spending" })}
                            className="rounded-[6px] border border-[rgba(20,22,26,0.14)] px-2.5 py-1 text-[11px] font-semibold text-[#1A1C20] hover:bg-[#F4F5F7]"
                          >
                            Spending
                          </button>
                        )}
                        {Math.abs(row.earnedDiff) > 1 && (
                          <button
                            type="button"
                            onClick={() => setFixing({ row, wallet: "earned" })}
                            className="rounded-[6px] border border-[rgba(20,22,26,0.14)] px-2.5 py-1 text-[11px] font-semibold text-[#1A1C20] hover:bg-[#F4F5F7]"
                          >
                            Earned
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reconciliation KPIs */}
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
        {RECONCILIATION_ITEMS.map((item) => {
          const value = rec ? rec[item.key] : 0;
          return (
            <div key={item.key} className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
              <div className="flex items-center gap-2">
                <span className="h-[8px] w-[8px] rounded-full" style={{ background: item.accent }} />
                <span className="text-[12px] font-medium text-[#646B73]">{item.label}</span>
              </div>
              <div className="mt-2 font-[family-name:var(--font-display)] text-[28px] font-semibold tabular-nums text-[#1A1C20]">
                {(value as number).toLocaleString()}
              </div>
              <span className="text-[11px] text-[#9AA0A8]">cowries</span>
            </div>
          );
        })}
      </div>

      {/* Where "Total issued" actually comes from — a "cowries in circulation"
          figure is meaningless for judging real revenue unless it's split by
          source, since referral rewards and admin corrections issue cowries
          with no purchase behind them. */}
      <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
        <h3 className="mb-4 text-[13px] font-semibold text-[#1A1C20]">Issuance breakdown</h3>
        <div className="space-y-3">
          {[
            { label: "Purchased (real top-ups)", value: rec?.totalFromTopUps ?? 0, accent: "#1F8A5B" },
            { label: "Referral rewards (free)", value: rec?.totalFromReferralRewards ?? 0, accent: "#1E3A8A" },
            { label: "Admin adjustments (net, free)", value: rec?.totalFromAdminAdjustments ?? 0, accent: "#B7791F" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-[8px] w-[8px] flex-none rounded-full" style={{ background: row.accent }} />
                <span className="text-[13px] text-[#1A1C20]">{row.label}</span>
              </div>
              <span className="text-[13px] font-semibold tabular-nums text-[#1A1C20]">{row.value.toLocaleString()} cowries</span>
            </div>
          ))}
        </div>
      </div>

      {/* Admin cowrie policy: admins no longer get free unlocks (enforced
          server-side in unlockStory), so they shouldn't accumulate any
          spending balance at all. Earned balance is real writer income
          regardless of role and is never touched here. */}
      <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[13px] font-semibold text-[#1A1C20]">Admin cowrie policy</h3>
            <p className="mt-0.5 text-[12px] text-[#8B919A]">
              Admin accounts no longer get free unlocks. This zeroes every admin account&apos;s spending
              balance only — earned (withdrawable) balances are never touched.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearAdminCowries}
            disabled={clearingAdmins}
            className="flex-none rounded-[8px] border border-[#C0392B]/30 px-4 py-2 text-[12px] font-semibold text-[#C0392B] hover:bg-[rgba(192,57,43,0.06)] disabled:opacity-50"
          >
            {clearingAdmins ? "Clearing…" : "Clear admin spending cowries"}
          </button>
        </div>
        {clearResult && <p className="mt-3 text-[12px] text-[#646B73]">{clearResult}</p>}
      </div>

      {/* Time-series chart */}
      <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[13px] font-semibold text-[#1A1C20]">Economy activity over time</h3>
            <p className="mt-0.5 text-[12px] text-[#8B919A]">Issued, spent, and withdrawn cowries per day</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap gap-4 text-[11px] text-[#646B73]">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[#1A1C20]" /> Issued</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[#C75D2C]" /> Spent</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[#B7791F]" /> Withdrawn</span>
            </div>
            <div className="flex gap-1 rounded-[8px] bg-[rgba(20,22,26,0.06)] p-[3px]">
              {["7d", "30d", "90d"].map((r) => (
                <button key={r} type="button" onClick={() => setRange(r)} className={cn("rounded-[6px] px-3 py-1 text-[11px] font-semibold transition-colors", range === r ? "bg-[#1A1C20] text-white" : "text-[#8B919A]")}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <AreaChart
          data={timeseries}
          keys={[
            { key: "issued", color: "#1A1C20", label: "Issued" },
            { key: "spent", color: "#C75D2C", label: "Spent" },
            { key: "withdrawn", color: "#B7791F", label: "Withdrawn" },
          ]}
        />
      </div>

      {fixing && (
        <AdjustCowriesModal
          userId={fixing.row.userId}
          userName={fixing.row.name}
          initialWallet={fixing.wallet}
          initialAmount={fixing.wallet === "spending" ? Math.round(fixing.row.spendingDiff) : fixing.row.earnedDiff}
          initialReason={`Ledger backfill for ${fixing.row.name}'s untracked ${fixing.wallet} balance found by wallet audit — flagged on the Cowrie Economy dashboard.`}
          initialRecordOnly
          onClose={() => setFixing(null)}
          onSuccess={() => {
            setFixing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
