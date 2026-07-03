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

    const [dailyReport] = await Promise.all([
      runGA4Report({
        dimensions: [{ name: "date" }],
        metrics: [{ name: "newUsers" }],
        dateRanges: [range],
        dimensionFilter: dimFilter,
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    ]);

    const ga4Error = !dailyReport ? "GA4 API unavailable or credentials not configured" : undefined;

    const daily = dailyReport?.rows?.map((r) => ({
      date: r.dimensionValues?.[0]?.value ?? "",
      newUsers: parseInt(r.metricValues?.[0]?.value ?? "0"),
    })) ?? [];

    return NextResponse.json({
      daily,
      retention: [],
      ...(ga4Error ? { partialData: true, ga4Error } : {}),
    });
  },
  { roles: ["ADMIN"] },
);
