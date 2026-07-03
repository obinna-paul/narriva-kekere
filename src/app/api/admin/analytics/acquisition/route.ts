export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { runGA4Report } from "@/lib/analytics/ga4";

function dateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get("days") ?? "30", 10)));
    const platform = url.searchParams.get("platform")?.toUpperCase() ?? null;

    const range = dateRange(days);
    const dimFilter = buildHostnameFilter(platform);
    const events = platform === "KEKERE" ? "sign_up" : platform === "NARRIVA" ? "form_submit" : "sign_up";

    const [sourceReport, referrerReport, landingReport] = await Promise.all([
      runGA4Report({
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        dateRanges: [range],
        dimensionFilter: dimFilter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      }),
      runGA4Report({
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
        dateRanges: [range],
        dimensionFilter: dimFilter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      }),
      runGA4Report({
        dimensions: [{ name: "landingPage" }],
        metrics: [{ name: "sessions" }, { name: "bounceRate" }],
        dateRanges: [range],
        dimensionFilter: dimFilter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      }),
    ]);

    const ga4Error = !sourceReport ? "GA4 API unavailable or credentials not configured" : undefined;

    return NextResponse.json({
      sources: sourceReport?.rows?.map((r) => ({
        channel: r.dimensionValues?.[0]?.value ?? "",
        sessions: parseInt(r.metricValues?.[0]?.value ?? "0"),
        users: parseInt(r.metricValues?.[1]?.value ?? "0"),
      })) ?? [],
      referrers: referrerReport?.rows?.map((r) => ({
        source: r.dimensionValues?.[0]?.value ?? "",
        sessions: parseInt(r.metricValues?.[0]?.value ?? "0"),
      })) ?? [],
      landingPages: landingReport?.rows?.map((r) => ({
        path: r.dimensionValues?.[0]?.value ?? "",
        sessions: parseInt(r.metricValues?.[0]?.value ?? "0"),
        bounceRate: parseFloat(r.metricValues?.[1]?.value ?? "0"),
      })) ?? [],
      ...(ga4Error ? { partialData: true, ga4Error } : {}),
    });
  },
  { roles: ["ADMIN"] },
);
