export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

function startOfDay(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86400000);
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

interface ActivityEvent {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  link: string;
}

function wowChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function revenueDailyMap(): Map<string, { narrivaNgn: number; kekereNgn: number }> {
  const map = new Map<string, { narrivaNgn: number; kekereNgn: number }>();
  for (let i = 0; i < 30; i++) {
    map.set(formatDate(startOfDay(i)), { narrivaNgn: 0, kekereNgn: 0 });
  }
  return map;
}

function userDailyMap(): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    map.set(formatDate(startOfDay(i)), 0);
  }
  return map;
}

export const GET = withAuth(
  async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = daysAgo(30);
    const sevenDaysAgo = daysAgo(7);
    const fourteenDaysAgo = daysAgo(14);

    const [
      purchases30d,
      topUps30d,
      purchases7d,
      topUps7d,
      purchasesPrev7d,
      topUpsPrev7d,
      newUsers7d,
      newUsersPrev7d,
      newUsers30d,
      recentUnlocks,
      recentStories,
      prevUnlocks,
      prevStories,
      recentSubmissions,
      submissionsLastWeek,
      wallets,
      storiesAwaitingReview,
      authorChangeRequests,
      withdrawalsPending,
      unsignedContracts7Plus,
      nariHighIntentUnread,
      submissionsActivity,
      storiesSubmittedActivity,
      storiesPublishedActivity,
      purchasesActivity,
      withdrawalsActivity,
      deliverablesChangedActivity,
      deliverablesApprovedActivity,
      contractsSignedActivity,
    ] = await Promise.all([
      prisma.bookPurchase.findMany({
        where: { purchasedAt: { gte: thirtyDaysAgo, lte: now } },
        include: { book: { select: { price: true, title: true } } },
      }),
      prisma.transaction.findMany({
        where: { type: "TOP_UP", status: "COMPLETED", createdAt: { gte: thirtyDaysAgo, lte: now } },
        select: { amountNgn: true, createdAt: true },
      }),
      prisma.bookPurchase.findMany({
        where: { purchasedAt: { gte: sevenDaysAgo, lte: now } },
        include: { book: { select: { price: true } } },
      }),
      prisma.transaction.findMany({
        where: { type: "TOP_UP", status: "COMPLETED", createdAt: { gte: sevenDaysAgo, lte: now } },
        select: { amountNgn: true },
      }),
      prisma.bookPurchase.findMany({
        where: { purchasedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
        include: { book: { select: { price: true } } },
      }),
      prisma.transaction.findMany({
        where: { type: "TOP_UP", status: "COMPLETED", createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
        select: { amountNgn: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo, lte: now } },
        select: { createdAt: true },
      }),
      prisma.storyUnlock.findMany({
        where: { unlockedAt: { gte: sevenDaysAgo, lte: now } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.story.findMany({
        where: { createdAt: { gte: sevenDaysAgo, lte: now } },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      prisma.storyUnlock.findMany({
        where: { unlockedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.story.findMany({
        where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      prisma.narrivaSubmission.count({ where: { submittedAt: { gte: sevenDaysAgo } } }),
      prisma.narrivaSubmission.count({ where: { submittedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      prisma.wallet.aggregate({ _sum: { spendingBalance: true, earnedBalance: true } }),
      prisma.story.count({ where: { status: "SUBMITTED" } }),
      prisma.projectDeliverable.count({ where: { status: "CHANGES_REQUESTED" } }),
      prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
      prisma.kekereContract.count({ where: { status: "PENDING", sentAt: { lt: daysAgo(7) } } }),
      prisma.nariConversationIntel.count({ where: { intentLevel: "HIGH", leadId: null } }),
      prisma.narrivaSubmission.findMany({
        where: { submittedAt: { gte: thirtyDaysAgo } },
        orderBy: { submittedAt: "desc" },
        take: 25,
        select: { id: true, manuscriptTitle: true, authorName: true, submittedAt: true },
      }),
      prisma.story.findMany({
        where: { status: "SUBMITTED", submittedAt: { gte: thirtyDaysAgo } },
        orderBy: { submittedAt: "desc" },
        take: 25,
        select: { id: true, title: true, author: { select: { slug: true } }, submittedAt: true },
      }),
      prisma.story.findMany({
        where: { status: "PUBLISHED", publishedAt: { gte: thirtyDaysAgo } },
        orderBy: { publishedAt: "desc" },
        take: 25,
        select: { id: true, title: true, publishedAt: true },
      }),
      prisma.bookPurchase.findMany({
        where: { purchasedAt: { gte: thirtyDaysAgo } },
        orderBy: { purchasedAt: "desc" },
        take: 25,
        include: { book: { select: { title: true } } },
      }),
      prisma.withdrawalRequest.findMany({
        where: { requestedAt: { gte: thirtyDaysAgo } },
        orderBy: { requestedAt: "desc" },
        take: 25,
        include: { user: { select: { name: true } } },
      }),
      prisma.projectDeliverable.findMany({
        where: { status: "CHANGES_REQUESTED", updatedAt: { gte: thirtyDaysAgo } },
        orderBy: { updatedAt: "desc" },
        take: 25,
        include: { project: { select: { id: true, bookTitle: true } } },
      }),
      prisma.projectDeliverable.findMany({
        where: { status: "APPROVED", updatedAt: { gte: thirtyDaysAgo } },
        orderBy: { updatedAt: "desc" },
        take: 25,
        include: { project: { select: { id: true, bookTitle: true } } },
      }),
      prisma.kekereContract.findMany({
        where: { status: "SIGNED", signedAt: { gte: thirtyDaysAgo } },
        orderBy: { signedAt: "desc" },
        take: 25,
        include: { writer: { select: { name: true } } },
      }),
    ]);

    // ---- Revenue ----
    const thisMonthPurchasesNgn = purchases30d
      .filter((p) => p.purchasedAt >= monthStart)
      .reduce((sum, p) => sum + p.book.price, 0);
    const thisMonthTopUpsNgn = topUps30d
      .filter((t) => t.createdAt >= monthStart)
      .reduce((sum, t) => sum + (t.amountNgn ?? 0), 0);
    const totalRevenueThisMonthNgn = thisMonthPurchasesNgn + thisMonthTopUpsNgn;

    const revenueThisWeek =
      purchases7d.reduce((s, p) => s + p.book.price, 0) +
      topUps7d.reduce((s, t) => s + (t.amountNgn ?? 0), 0);
    const revenueLastWeek =
      purchasesPrev7d.reduce((s, p) => s + p.book.price, 0) +
      topUpsPrev7d.reduce((s, t) => s + (t.amountNgn ?? 0), 0);

    // ---- Active Kekere users ----
    const activeKekereUserIds = new Set<string>();
    for (const u of recentUnlocks) activeKekereUserIds.add(u.userId);
    for (const s of recentStories) activeKekereUserIds.add(s.authorId);
    const activeKekereUsersLast7Days = activeKekereUserIds.size;

    const prevActiveUserIds = new Set<string>();
    for (const u of prevUnlocks) prevActiveUserIds.add(u.userId);
    for (const s of prevStories) prevActiveUserIds.add(s.authorId);

    // ---- Cowries ----
    const cowriesInCirculation =
      (wallets._sum.spendingBalance ?? 0) + (wallets._sum.earnedBalance ?? 0);

    // ---- Pending actions ----
    const storiesAwaiting = storiesAwaitingReview;
    const authorChanges = authorChangeRequests;
    const withdrawalsPendingCount = withdrawalsPending;
    const contractsUnsigned = unsignedContracts7Plus;
    const nariHighIntent = nariHighIntentUnread;

    const pendingActionsBreakdown = {
      storiesAwaitingReview: storiesAwaiting,
      authorChangeRequests: authorChanges,
      withdrawalsPending: withdrawalsPendingCount,
      contractsUnsigned7Plus: contractsUnsigned,
      nariHighIntentUnread: nariHighIntent,
    };

    const pendingActionsCount =
      storiesAwaiting + authorChanges + withdrawalsPendingCount + contractsUnsigned + nariHighIntent;

    // ---- Revenue chart ----
    const revenueDaily = revenueDailyMap();
    for (const p of purchases30d) {
      const date = formatDate(p.purchasedAt);
      const entry = revenueDaily.get(date);
      if (entry) entry.narrivaNgn += p.book.price;
    }
    for (const t of topUps30d) {
      const date = formatDate(t.createdAt);
      const entry = revenueDaily.get(date);
      if (entry) entry.kekereNgn += t.amountNgn ?? 0;
    }

    // ---- User growth chart ----
    const userDaily = userDailyMap();
    for (const u of newUsers30d) {
      const date = formatDate(u.createdAt);
      const count = userDaily.get(date);
      if (count !== undefined) userDaily.set(date, count + 1);
    }

    // ---- Activity feed ----
    const events: ActivityEvent[] = [];

    for (const s of submissionsActivity) {
      events.push({
        id: `sub-${s.id}`,
        type: "submission_received",
        description: `New manuscript submitted — ${s.manuscriptTitle} by ${s.authorName}`,
        timestamp: s.submittedAt,
        link: `/admin/narriva/submissions/${s.id}`,
      });
    }

    for (const s of storiesSubmittedActivity) {
      if (!s.submittedAt) continue;
      events.push({
        id: `story-sub-${s.id}`,
        type: "story_submitted",
        description: `Story submitted for review — ${s.title} by ${s.author.slug ?? "unknown"}`,
        timestamp: s.submittedAt,
        link: `/admin/kekere/stories/${s.id}`,
      });
    }

    for (const s of storiesPublishedActivity) {
      if (!s.publishedAt) continue;
      events.push({
        id: `story-pub-${s.id}`,
        type: "story_published",
        description: `Story published — ${s.title}`,
        timestamp: s.publishedAt,
        link: `/admin/kekere/stories/${s.id}`,
      });
    }

    for (const p of purchasesActivity) {
      events.push({
        id: `purchase-${p.id}`,
        type: "book_sold",
        description: `Book sold — ${p.book.title}`,
        timestamp: p.purchasedAt,
        link: "/admin/narriva/book-sales",
      });
    }

    for (const w of withdrawalsActivity) {
      events.push({
        id: `withdrawal-${w.id}`,
        type: "withdrawal_requested",
        description: `Withdrawal requested — ${w.user.name}, ${w.cowriesAmount} cowries`,
        timestamp: w.requestedAt,
        link: `/admin/kekere/withdrawals/${w.id}`,
      });
    }

    for (const d of deliverablesChangedActivity) {
      events.push({
        id: `del-chg-${d.id}`,
        type: "author_requested_changes",
        description: `Author requested changes — ${d.project.bookTitle}, ${d.label}`,
        timestamp: d.updatedAt,
        link: `/admin/narriva/projects/${d.project.id}`,
      });
    }

    for (const d of deliverablesApprovedActivity) {
      events.push({
        id: `del-app-${d.id}`,
        type: "deliverable_approved",
        description: `Deliverable approved — ${d.project.bookTitle}, ${d.label}`,
        timestamp: d.updatedAt,
        link: `/admin/narriva/projects/${d.project.id}`,
      });
    }

    for (const c of contractsSignedActivity) {
      if (!c.signedAt) continue;
      events.push({
        id: `contract-${c.id}`,
        type: "contract_signed",
        description: `Contract signed — ${c.writer.name}`,
        timestamp: c.signedAt,
        link: `/admin/kekere/contracts/${c.id}`,
      });
    }

    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({
      kpiCards: {
        totalRevenueThisMonthNgn: Math.round(totalRevenueThisMonthNgn * 100) / 100,
        totalRevenueWoWChange: wowChange(revenueThisWeek, revenueLastWeek),
        newUsersLast7Days: newUsers7d,
        newUsersWoWChange: wowChange(newUsers7d, newUsersPrev7d),
        activeKekereUsersLast7Days,
        activeKekereWoWChange: wowChange(activeKekereUsersLast7Days, prevActiveUserIds.size),
        newSubmissionsThisWeek: recentSubmissions,
        submissionsWoWChange: wowChange(recentSubmissions, submissionsLastWeek),
        cowriesInCirculation,
        pendingActionsCount,
      },
      pendingActionsBreakdown,
      revenueChart: {
        daily: Array.from(revenueDaily.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, val]) => ({
            date,
            narrivaNgn: Math.round(val.narrivaNgn * 100) / 100,
            kekereNgn: Math.round(val.kekereNgn * 100) / 100,
          })),
      },
      userGrowthChart: {
        daily: Array.from(userDaily.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, newUsers: count })),
      },
      activityFeed: events.slice(0, 25).map((e) => ({
        id: e.id,
        type: e.type,
        description: e.description,
        timestamp: e.timestamp.toISOString(),
        link: e.link,
      })),
    });
  },
  { roles: ["ADMIN"] },
);
