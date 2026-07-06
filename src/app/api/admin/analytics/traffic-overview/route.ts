export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { runGA4Report } from "@/lib/analytics/ga4";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// `days`-long windows that don't share a boundary day — GA4 date ranges are
// inclusive on both ends, so naively reusing one range's start as the other
// range's end double-counts that day in both totals.
function dateRange(days: number, endOffset = 0): { startDate: string; endDate: string } {
  const end = new Date();
  end.setDate(end.getDate() - endOffset);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { startDate: iso(start), endDate: iso(end) };
}

function buildHostnameFilter(platform: string | null) {
  if (!platform || platform === "ALL") return undefined;
  const hostname = platform === "KEKERE" ? "kekere.narriva.com" : "narriva.com";
  return {
    filter: {
      fieldName: "hostname",
      stringFilter: { matchType: "EXACT", value: hostname },
    },
  };
}

function safeMetric(report: { rows?: { metricValues?: { value: string }[] }[] } | null, index: number): number {
  const val = report?.rows?.[0]?.metricValues?.[index]?.value;
  return val ? parseFloat(val) : 0;
}

function parseDailyRows(report: { rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[] } | null): { date: string; value: number }[] {
  if (!report?.rows) return [];
  return report.rows.map((row) => ({
    date: row.dimensionValues?.[0]?.value ?? "",
    value: parseFloat(row.metricValues?.[0]?.value ?? "0"),
  }));
}

export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get("days") ?? "30", 10)));
    const platform = url.searchParams.get("platform")?.toUpperCase() ?? null;

    const currentRange = dateRange(days);
    const prevRange = dateRange(days, days);

    const dimFilter = buildHostnameFilter(platform);

    const baseRequest = {
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
        { name: "screenPageViewsPerSession" },
      ],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      keepEmptyRows: false,
    };

    const [currentReport, prevReport] = await Promise.all([
      runGA4Report({
        ...baseRequest,
        dateRanges: [currentRange],
        dimensionFilter: dimFilter,
      }),
      runGA4Report({
        ...baseRequest,
        dateRanges: [prevRange],
        dimensionFilter: dimFilter,
      }),
    ]);

    const ga4Error = !currentReport ? "GA4 API unavailable or credentials not configured" : undefined;
    const partialData = !!ga4Error;

    const sessions = currentReport?.rows?.reduce((sum, r) => sum + parseInt(r.metricValues?.[0]?.value ?? "0"), 0) ?? 0;
    const users = currentReport?.rows?.reduce((sum, r) => sum + parseInt(r.metricValues?.[1]?.value ?? "0"), 0) ?? 0;
    const pageviews = currentReport?.rows?.reduce((sum, r) => sum + parseInt(r.metricValues?.[2]?.value ?? "0"), 0) ?? 0;

    const prevSessions = prevReport?.rows?.reduce((sum, r) => sum + parseInt(r.metricValues?.[0]?.value ?? "0"), 0) ?? 0;
    const prevUsers = prevReport?.rows?.reduce((sum, r) => sum + parseInt(r.metricValues?.[1]?.value ?? "0"), 0) ?? 0;

    function vsLast(c: number, p: number): number {
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 1000) / 10;
    }

    const daily = currentReport?.rows?.map((r) => ({
      date: r.dimensionValues?.[0]?.value ?? "",
      sessions: parseInt(r.metricValues?.[0]?.value ?? "0"),
      users: parseInt(r.metricValues?.[1]?.value ?? "0"),
    })) ?? [];

    return NextResponse.json({
      summary: {
        sessions,
        users,
        pageviews,
        avgSessionDuration: safeMetric(currentReport, 3),
        bounceRate: safeMetric(currentReport, 4),
        pagesPerSession: safeMetric(currentReport, 5),
        vsLastPeriod: {
          sessions: vsLast(sessions, prevSessions),
          users: vsLast(users, prevUsers),
        },
      },
      daily,
      ...(partialData ? { partialData, ga4Error } : {}),
    });
  },
  { roles: ["ADMIN"] },
);
