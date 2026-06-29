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

    const [countryReport, cityReport, deviceReport, osReport] = await Promise.all([
      runGA4Report({
        dimensions: [{ name: "country" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        dateRanges: [range],
        dimensionFilter: dimFilter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 50,
      }),
      runGA4Report({
        dimensions: [{ name: "city" }, { name: "country" }],
        metrics: [{ name: "sessions" }],
        dateRanges: [range],
        dimensionFilter: dimFilter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 50,
      }),
      runGA4Report({
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
        dateRanges: [range],
        dimensionFilter: dimFilter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }),
      runGA4Report({
        dimensions: [{ name: "operatingSystem" }],
        metrics: [{ name: "sessions" }],
        dateRanges: [range],
        dimensionFilter: dimFilter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 5,
      }),
    ]);

    const ga4Error = !countryReport ? "GA4 API unavailable or credentials not configured" : undefined;

    return NextResponse.json({
      countries: countryReport?.rows?.map((r) => ({
        country: r.dimensionValues?.[0]?.value ?? "",
        sessions: parseInt(r.metricValues?.[0]?.value ?? "0"),
        users: parseInt(r.metricValues?.[1]?.value ?? "0"),
      })) ?? [],
      cities: cityReport?.rows?.map((r) => ({
        city: r.dimensionValues?.[0]?.value ?? "",
        country: r.dimensionValues?.[1]?.value ?? "",
        sessions: parseInt(r.metricValues?.[0]?.value ?? "0"),
      })) ?? [],
      devices: deviceReport?.rows?.map((r) => ({
        deviceCategory: r.dimensionValues?.[0]?.value ?? "",
        sessions: parseInt(r.metricValues?.[0]?.value ?? "0"),
      })) ?? [],
      operatingSystems: osReport?.rows?.map((r) => ({
        os: r.dimensionValues?.[0]?.value ?? "",
        sessions: parseInt(r.metricValues?.[0]?.value ?? "0"),
      })) ?? [],
      ...(ga4Error ? { partialData: true, ga4Error } : {}),
    });
  },
  { roles: ["ADMIN"] },
);
