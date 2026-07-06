export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { runGA4Report } from "@/lib/analytics/ga4";
import { prisma } from "@/lib/db/prisma";

// `days`-long windows that don't share a boundary day — GA4 date ranges are
// inclusive on both ends, so naively reusing one range's start as the other
// range's end double-counts that day in both totals.
function dateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const pad = (n: number) => n.toString().padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { startDate: iso(start), endDate: iso(end) };
}

function prevMonthRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  end.setDate(end.getDate() - days);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const pad = (n: number) => n.toString().padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { startDate: iso(start), endDate: iso(end) };
}

export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get("days") ?? "30", 10)));

    const thisRange = dateRange(days);
    const lastRange = prevMonthRange(days);
    const thirtyDaysAgo = new Date(Date.now() - days * 86400000);
    // Revenue-vs-target must be true month-to-date — monthlyTarget is a
    // calendar-month goal, so comparing it against a rolling 30-day total
    // overstates progress early in the month and understates it late.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      currentTraffic,
      lastTraffic,
      channelReport,
      topPageReport,
      bestDayDailyReport,
      storyUnlocks,
      manuscriptSubmissions,
      monthlyTargetSetting,
      purchasesThisMonth,
      topUpsThisMonth,
    ] = await Promise.all([
      runGA4Report({
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        dateRanges: [thisRange],
      }),
      runGA4Report({
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        dateRanges: [lastRange],
      }),
      runGA4Report({
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        dateRanges: [thisRange],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 1,
      }),
      runGA4Report({
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        dateRanges: [thisRange],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 1,
      }),
      runGA4Report({
        dimensions: [{ name: "date" }],
        metrics: [{ name: "newUsers" }],
        dateRanges: [thisRange],
        orderBys: [{ metric: { metricName: "newUsers" }, desc: true }],
        limit: 1,
      }),
      prisma.storyUnlock.count({ where: { unlockedAt: { gte: thirtyDaysAgo } } }),
      prisma.narrivaSubmission.count({ where: { submittedAt: { gte: thirtyDaysAgo } } }),
      prisma.platformSetting.findUnique({ where: { key: "monthlyRevenueTarget" } }),
      prisma.bookPurchase.findMany({
        where: { purchasedAt: { gte: monthStart } },
        include: { book: { select: { price: true } } },
      }),
      prisma.transaction.findMany({
        where: { type: "TOP_UP", status: "COMPLETED", createdAt: { gte: monthStart } },
        select: { amountNgn: true },
      }),
    ]);

    const ga4Error = !currentTraffic ? "GA4 API unavailable or credentials not configured" : undefined;

    const safeMetric = (report: typeof currentTraffic, idx: number) =>
      parseInt(report?.rows?.[0]?.metricValues?.[idx]?.value ?? "0", 10);

    function vsLast(cur: number, prev: number): number {
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 1000) / 10;
    }

    const bestDay = bestDayDailyReport?.rows?.[0];
    const bestDayDateStr = bestDay?.dimensionValues?.[0]?.value ?? null;

    let bestDaySource: string | null = null;
    if (bestDayDateStr) {
      const sourceReport = await runGA4Report({
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        dateRanges: [{ startDate: bestDayDateStr, endDate: bestDayDateStr }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 1,
      });
      bestDaySource = sourceReport?.rows?.[0]?.dimensionValues?.[0]?.value ?? null;
    }

    const monthlyTarget = monthlyTargetSetting ? parseFloat(monthlyTargetSetting.value) : 0;

    const narrivaRevenue = purchasesThisMonth.reduce((s, p) => s + p.book.price, 0);
    const kekereRevenue = topUpsThisMonth.reduce((s, t) => s + (t.amountNgn ?? 0), 0);
    const totalRevenue = narrivaRevenue + kekereRevenue;

    return NextResponse.json({
      usersMoM: {
        current: safeMetric(currentTraffic, 1),
        previous: safeMetric(lastTraffic, 1),
        change: vsLast(safeMetric(currentTraffic, 1), safeMetric(lastTraffic, 1)),
      },
      sessionsMoM: {
        current: safeMetric(currentTraffic, 0),
        previous: safeMetric(lastTraffic, 0),
        change: vsLast(safeMetric(currentTraffic, 0), safeMetric(lastTraffic, 0)),
      },
      narrivaRevenue,
      kekereRevenue,
      storyUnlocks,
      manuscriptSubmissions,
      topAcquisitionChannel: channelReport?.rows?.[0]?.dimensionValues?.[0]?.value ?? null,
      topContent: topPageReport?.rows?.[0]?.dimensionValues?.[0]?.value ?? null,
      bestDay: bestDayDateStr
        ? {
            date: bestDayDateStr,
            newUsers: parseInt(bestDay?.metricValues?.[0]?.value ?? "0", 10),
            topSource: bestDaySource,
          }
        : null,
      revenueTarget: {
        monthlyTarget,
        actual: totalRevenue,
        percentageAchieved: monthlyTarget > 0
          ? Math.round((totalRevenue / monthlyTarget) * 1000) / 10
          : 0,
      },
      ...(ga4Error ? { partialData: true, ga4Error } : {}),
    });
  },
  { roles: ["ADMIN"] },
);
