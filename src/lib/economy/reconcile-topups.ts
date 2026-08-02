import { listTransactions, type PaystackListedTransaction } from "@/lib/paystack/client";
import { creditTopUp } from "@/lib/economy/cowries";
import { COWRIE_TOPUP_PACKAGES } from "@/content/decisions";
import { triggerReferralRewardOnFirstTopUp } from "@/lib/data/kekere-referrals";
import { sendFirstTopUpThankYouEmail } from "@/lib/data/kekere-wallet";

export interface ReconcileTopUpsResult {
  checked: number;
  credited: number;
  alreadyCredited: number;
  skipped: number;
  creditedDetails: Array<{ reference: string; email: string | null; cowries: number }>;
}

// Metadata can come back from Paystack's list API as either an object or a
// JSON string, depending on how it was originally attached — normalise both.
function readMetadata(raw: PaystackListedTransaction["metadata"]): { type?: string; userId?: string } {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as { type?: string; userId?: string };
    } catch {
      return {};
    }
  }
  return raw as { type?: string; userId?: string };
}

/**
 * The guarantee behind "every settled payment ends up as cowries": a sweep
 * over Paystack's own record of successful charges that credits any wallet
 * top-up which never got credited — whatever the reason the client verify and
 * the webhook both missed it (a dropped connection, a webhook-delivery outage,
 * a signature/secret mismatch). Independent of the buyer's browser and of the
 * webhook entirely.
 *
 * Every credit goes through the same idempotent creditTopUp() keyed on the
 * reference, so a top-up the fast paths already handled is a no-op here and
 * nothing is ever double-credited. Safe to run on a schedule and on demand.
 * Never throws per-transaction — one bad row (e.g. a since-deleted account,
 * caught by the wallet's foreign key) is counted as skipped, not allowed to
 * abort the sweep.
 */
export async function reconcileRecentTopUps(opts: { sinceHours?: number; maxPages?: number } = {}): Promise<ReconcileTopUpsResult> {
  const sinceHours = opts.sinceHours ?? 72;
  const maxPages = opts.maxPages ?? 5;
  const from = new Date(Date.now() - sinceHours * 3600_000).toISOString();

  const result: ReconcileTopUpsResult = { checked: 0, credited: 0, alreadyCredited: 0, skipped: 0, creditedDetails: [] };

  for (let page = 1; page <= maxPages; page++) {
    const { transactions, pageCount } = await listTransactions({ status: "success", perPage: 100, page, from });

    for (const txn of transactions) {
      const meta = readMetadata(txn.metadata);
      // Only wallet top-ups this system issued, tied to an account, for an
      // amount that maps to a known package. Anything else (book purchases,
      // legacy/custom amounts) is out of scope and left for a human.
      if (meta.type !== "wallet_topup" || !meta.userId) continue;
      const paidNGN = txn.amount / 100;
      const pkg = COWRIE_TOPUP_PACKAGES.find((p) => p.priceNGN === paidNGN);
      if (!pkg) continue;

      result.checked++;
      const cowriesTotal = pkg.cowries + pkg.bonusCowries;
      try {
        const credit = await creditTopUp(meta.userId, cowriesTotal, txn.reference);
        if ("already_processed" in credit) {
          result.alreadyCredited++;
          continue;
        }
        result.credited++;
        result.creditedDetails.push({ reference: txn.reference, email: txn.customerEmail, cowries: cowriesTotal });
        // Missed top-ups may have missed their first-top-up hooks too — these
        // are awaited and idempotent, so running them now can only fill gaps.
        await triggerReferralRewardOnFirstTopUp(meta.userId, paidNGN).catch(() => {});
        await sendFirstTopUpThankYouEmail(meta.userId).catch(() => {});
      } catch {
        // A bad/since-deleted account (the wallet FK rejects it) or a transient
        // write error — count it and move on rather than abort the whole sweep.
        result.skipped++;
      }
    }

    if (page >= pageCount) break;
  }

  return result;
}
