import { prisma } from "@/lib/db/prisma";
import { getSettingNumber } from "@/lib/settings/get";
import { getRatingSummaryByStory, getWriterRatingSummary, type RatingSummary } from "@/lib/data/kekere-ratings";
import { WRITER_EARNINGS_RATE } from "@/content/decisions";

const EARNING_TX_TYPES = ["EARNINGS_CREDIT", "TIP_RECEIVED"] as const;
const ACTIVE_WITHDRAWAL_STATUSES = ["PENDING", "APPROVED", "PROCESSING"] as const;

function toUtcDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86400000);
}

export interface WriterOverview {
  publishedCount: number;
  /** Count of StoryUnlock rows (paid or first-story-free) across every
   *  published story — the same "reads" proxy already used on the writer's
   *  own profile and public writer page. There's no page-view/impression
   *  model in this schema, so a genuinely free read with no unlock row
   *  can't happen under current product rules (cowrieCost is enforced >=1
   *  everywhere a story is priced), which keeps this an accurate total
   *  rather than an undercount. */
  totalReads: number;
  /** Weighted across all stories (total completions / total reads), not an
   *  average of each story's own percentage — a weighted figure can't be
   *  skewed by one low-traffic story that happens to have a 100% or 0%
   *  rate. Null when there are no reads yet to compute a rate from. */
  avgCompletionRate: number | null;
  rating: RatingSummary;
  followerCount: number;
  /** Net new followers in the last 30 days — can be negative if unfollows
   *  outpaced new follows (Follow rows are hard-deleted on unfollow, so
   *  this is a genuine net figure, not just new-follow count). */
  followerGrowth30d: number;
  tipsReceivedCount: number;
}

export async function getWriterOverview(writerId: string): Promise<WriterOverview> {
  const [publishedCount, totalReads, totalCompletions, rating, followerCount, followersLast30d, tipsReceivedCount] =
    await Promise.all([
      prisma.story.count({ where: { authorId: writerId, status: "PUBLISHED" } }),
      prisma.storyUnlock.count({ where: { story: { authorId: writerId } } }),
      // Weighted across every story (total completions / total reads), not
      // an average of each story's own completionRate — a weighted figure
      // can't be skewed by one low-traffic story sitting at 100% or 0%.
      prisma.storyCompletion.count({ where: { story: { authorId: writerId } } }),
      getWriterRatingSummary(writerId),
      prisma.follow.count({ where: { writerId } }),
      prisma.follow.count({ where: { writerId, createdAt: { gte: daysAgo(30) } } }),
      prisma.tip.count({ where: { writerId } }),
    ]);

  const avgCompletionRate = totalReads > 0 ? Math.round((totalCompletions / totalReads) * 100) : null;

  return {
    publishedCount,
    totalReads,
    avgCompletionRate,
    rating,
    followerCount,
    followerGrowth30d: followersLast30d,
    tipsReceivedCount,
  };
}

export interface ActiveWithdrawal {
  id: string;
  cowries: number;
  ngn: number;
  status: "PENDING" | "APPROVED" | "PROCESSING";
  requestedAt: Date;
}

export interface WriterEarningsSummary {
  /** Withdrawable right now — Wallet.earnedBalance. Already excludes
   *  anything tied up in an active withdrawal request, since
   *  createWithdrawalRequest debits earnedBalance the moment the request
   *  is filed (see src/lib/economy/withdrawals.ts), not on completion. */
  available: number;
  /** Sum of active (PENDING/APPROVED/PROCESSING) withdrawal requests —
   *  money already earned and requested, just not yet in their bank
   *  account. There is only ever at most one active request per writer
   *  (createWithdrawalRequest rejects a second while one is active), but
   *  this is summed defensively rather than assuming that invariant here. */
  pending: number;
  /** Lifetime total ever credited from EARNINGS_CREDIT (their 70% share of
   *  unlocks) and TIP_RECEIVED transactions — NOT the current balance,
   *  which drops after every withdrawal. This is "everything you've ever
   *  earned," available always only reflects what's left to withdraw. */
  lifetimeEarned: number;
  lifetimeFromUnlocks: number;
  lifetimeFromTips: number;
  /** The live writer_earnings_rate setting (admin-configurable, defaults
   *  to WRITER_EARNINGS_RATE) — shown so the 70/30 split displayed is the
   *  real rate in effect today, not a hardcoded assumption. */
  writerRatePercent: number;
  hasBankDetails: boolean;
  activeWithdrawal: ActiveWithdrawal | null;
}

export async function getWriterEarningsSummary(writerId: string): Promise<WriterEarningsSummary> {
  const [wallet, bankDetails, activeWithdrawalRow, pendingAgg, earningsAgg, writerRate] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: writerId }, select: { earnedBalance: true } }),
    prisma.writerBankDetails.findUnique({ where: { userId: writerId }, select: { id: true } }),
    prisma.withdrawalRequest.findFirst({
      where: { userId: writerId, status: { in: [...ACTIVE_WITHDRAWAL_STATUSES] } },
      orderBy: { requestedAt: "desc" },
      select: { id: true, cowriesAmount: true, ngnAmount: true, status: true, requestedAt: true },
    }),
    // Summed defensively rather than trusting "there's only ever one active
    // request" (enforced by createWithdrawalRequest today, but this is
    // money — worth not assuming that invariant holds forever).
    prisma.withdrawalRequest.aggregate({
      where: { userId: writerId, status: { in: [...ACTIVE_WITHDRAWAL_STATUSES] } },
      _sum: { cowriesAmount: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        wallet: { userId: writerId },
        type: { in: [...EARNING_TX_TYPES] },
        status: "COMPLETED",
      },
      _sum: { amountCowries: true },
    }),
    getSettingNumber("writer_earnings_rate", WRITER_EARNINGS_RATE),
  ]);

  const fromUnlocks = earningsAgg.find((e) => e.type === "EARNINGS_CREDIT")?._sum.amountCowries?.toNumber() ?? 0;
  const fromTips = earningsAgg.find((e) => e.type === "TIP_RECEIVED")?._sum.amountCowries?.toNumber() ?? 0;

  return {
    available: wallet?.earnedBalance.toNumber() ?? 0,
    pending: pendingAgg._sum.cowriesAmount?.toNumber() ?? 0,
    lifetimeEarned: fromUnlocks + fromTips,
    lifetimeFromUnlocks: fromUnlocks,
    lifetimeFromTips: fromTips,
    writerRatePercent: Math.round(writerRate * 100),
    hasBankDetails: !!bankDetails,
    activeWithdrawal: activeWithdrawalRow
      ? {
          id: activeWithdrawalRow.id,
          cowries: activeWithdrawalRow.cowriesAmount.toNumber(),
          ngn: activeWithdrawalRow.ngnAmount,
          status: activeWithdrawalRow.status as "PENDING" | "APPROVED" | "PROCESSING",
          requestedAt: activeWithdrawalRow.requestedAt,
        }
      : null,
  };
}

export interface DailyPoint {
  date: string;
  value: number;
}

/** Daily earnings credited (unlocks + tips), oldest to newest — feeds the
 *  earnings sparkline. Bucketed in JS rather than a SQL date_trunc, same
 *  approach as the streak/greeting modules in this codebase, since the
 *  window is always small (<=90 rows to walk). */
export async function getWriterEarningsSeries(writerId: string, days = 30): Promise<DailyPoint[]> {
  const since = daysAgo(days);
  const rows = await prisma.transaction.findMany({
    where: {
      wallet: { userId: writerId },
      type: { in: [...EARNING_TX_TYPES] },
      status: "COMPLETED",
      createdAt: { gte: since },
    },
    select: { amountCowries: true, createdAt: true },
  });

  const byDay = new Map<string, number>();
  for (const row of rows) {
    const key = toUtcDateOnly(row.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + row.amountCowries.toNumber());
  }

  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = toUtcDateOnly(daysAgo(i));
    points.push({ date, value: byDay.get(date) ?? 0 });
  }
  return points;
}

/** Daily NEW follower counts, oldest to newest — feeds the follower-growth
 *  sparkline as a cumulative running total (net of unfollows within the
 *  window; a follower who joined before the window start is folded into
 *  the starting baseline). */
export async function getWriterFollowerSeries(writerId: string, days = 30): Promise<DailyPoint[]> {
  const since = daysAgo(days);
  const [baseline, rows] = await Promise.all([
    prisma.follow.count({ where: { writerId, createdAt: { lt: since } } }),
    prisma.follow.findMany({ where: { writerId, createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  const byDay = new Map<string, number>();
  for (const row of rows) {
    const key = toUtcDateOnly(row.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  const points: DailyPoint[] = [];
  let running = baseline;
  for (let i = days - 1; i >= 0; i--) {
    const date = toUtcDateOnly(daysAgo(i));
    running += byDay.get(date) ?? 0;
    points.push({ date, value: running });
  }
  return points;
}

export interface StoryAnalyticsRow {
  id: string;
  title: string;
  coverColor: string;
  coverImageRef: string | null;
  publishedAt: Date | null;
  reads: number;
  /** Story.completionRate — the same field already surfaced on public
   *  story cards, recalculated on every completion (see
   *  recalculateCompletionRate in kekere-progress.ts). Reused rather than
   *  recomputed here so this dashboard can never disagree with what a
   *  reader sees on the story's own cover. */
  completionRate: number;
  rating: RatingSummary;
  tips: number;
}

/** Per-story breakdown for the writer's own published stories, most-read
 *  first. Tip counts only — not a cowrie amount — because the Tip model
 *  has no amount field and the paired TIP_RECEIVED Transaction has no
 *  storyId to join back on, so a per-story dollar figure for tips can't be
 *  reconstructed exactly; showing a wrong number would be worse than
 *  showing a count. The account-level earnings ledger (getWriterEarningsSummary)
 *  is exact because it doesn't need that per-story attribution. */
export async function getWriterStoryBreakdown(writerId: string): Promise<StoryAnalyticsRow[]> {
  const stories = await prisma.story.findMany({
    where: { authorId: writerId, status: "PUBLISHED" },
    select: { id: true, title: true, coverColor: true, coverImageRef: true, publishedAt: true, completionRate: true },
  });
  if (stories.length === 0) return [];

  const storyIds = stories.map((s) => s.id);
  const [unlockCounts, ratingByStory, tipCounts] = await Promise.all([
    prisma.storyUnlock.groupBy({ by: ["storyId"], where: { storyId: { in: storyIds } }, _count: { storyId: true } }),
    getRatingSummaryByStory(storyIds),
    prisma.tip.groupBy({ by: ["storyId"], where: { storyId: { in: storyIds } }, _count: { storyId: true } }),
  ]);

  const readsByStory = new Map(unlockCounts.map((u) => [u.storyId, u._count.storyId]));
  const tipsByStory = new Map(tipCounts.map((t) => [t.storyId, t._count.storyId]));

  return stories
    .map((s) => ({
      id: s.id,
      title: s.title,
      coverColor: s.coverColor,
      coverImageRef: s.coverImageRef,
      publishedAt: s.publishedAt,
      reads: readsByStory.get(s.id) ?? 0,
      completionRate: s.completionRate ?? 0,
      rating: ratingByStory.get(s.id) ?? { average: null, count: 0 },
      tips: tipsByStory.get(s.id) ?? 0,
    }))
    .sort((a, b) => b.reads - a.reads);
}
