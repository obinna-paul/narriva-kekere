import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { runGA4Report, type GA4ReportResponse } from "@/lib/analytics/ga4";

function dateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { startDate: iso(start), endDate: iso(end) };
}

function hostnameFilter(hostname: string) {
  return {
    filter: {
      fieldName: "hostname",
      stringFilter: { matchType: "EXACT" as const, value: hostname },
    },
  };
}

function safeSessions(report: GA4ReportResponse | null): number {
  return report?.rows?.reduce((sum, r) => sum + parseInt(r.metricValues?.[0]?.value ?? "0"), 0) ?? 0;
}

function safeEventCount(report: GA4ReportResponse | null): number {
  return parseInt(report?.rows?.[0]?.metricValues?.[0]?.value ?? "0") || 0;
}

function safePageview(report: GA4ReportResponse | null): number {
  return report?.rows?.reduce((sum, r) => sum + parseInt(r.metricValues?.[0]?.value ?? "0"), 0) ?? 0;
}

function dropoff(prev: number, current: number): number {
  if (prev === 0) return 0;
  return Math.round(((prev - current) / prev) * 1000) / 10;
}

export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get("days") ?? "30", 10)));
    const range = dateRange(days);

    const narrivaFilter = hostnameFilter("narriva.com");
    const kekereFilter = hostnameFilter("kekere.narriva.com");

    const [
      narrivaSessions,
      narrivaServices,
      narrivaFormView,
      narrivaFormSubmit,
      kekereSessions,
      kekereEngaged,
      kekereAuthPage,
      kekereSignedUp,
    ] = await Promise.all([
      runGA4Report({
        metrics: [{ name: "sessions" }],
        dateRanges: [range],
        dimensionFilter: narrivaFilter,
      }),
      runGA4Report({
        metrics: [{ name: "sessions" }],
        dateRanges: [range],
        dimensionFilter: {
          andGroup: {
            expressions: [
              narrivaFilter,
              {
                filter: {
                  fieldName: "pageLocation",
                  stringFilter: { matchType: "CONTAINS", value: "/services" },
                },
              },
            ],
          },
        },
      }),
      runGA4Report({
        metrics: [{ name: "eventCount" }],
        dateRanges: [range],
        dimensionFilter: {
          andGroup: {
            expressions: [
              narrivaFilter,
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: { matchType: "EXACT", value: "form_submit" },
                },
              },
            ],
          },
        },
      }),
      runGA4Report({
        metrics: [{ name: "eventCount" }],
        dateRanges: [range],
        dimensionFilter: {
          andGroup: {
            expressions: [
              narrivaFilter,
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: { matchType: "EXACT", value: "form_submit" },
                },
              },
              {
                filter: {
                  fieldName: "pageLocation",
                  stringFilter: { matchType: "CONTAINS", value: "/submit" },
                },
              },
            ],
          },
        },
      }),
      runGA4Report({
        metrics: [{ name: "sessions" }],
        dateRanges: [range],
        dimensionFilter: kekereFilter,
      }),
      runGA4Report({
        metrics: [{ name: "sessions" }],
        dateRanges: [range],
        dimensionFilter: {
          andGroup: {
            expressions: [
              kekereFilter,
              {
                filter: {
                  fieldName: "engagementTime",
                  numericFilter: { operation: "GREATER_THAN", value: { int64Value: "0" } },
                },
              },
            ],
          },
        },
      }),
      runGA4Report({
        metrics: [{ name: "screenPageViews" }],
        dateRanges: [range],
        dimensionFilter: {
          andGroup: {
            expressions: [
              kekereFilter,
              {
                filter: {
                  fieldName: "pageLocation",
                  stringFilter: { matchType: "CONTAINS", value: "/auth" },
                },
              },
            ],
          },
        },
      }),
      runGA4Report({
        metrics: [{ name: "eventCount" }],
        dateRanges: [range],
        dimensionFilter: {
          andGroup: {
            expressions: [
              kekereFilter,
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: { matchType: "EXACT", value: "sign_up" },
                },
              },
            ],
          },
        },
      }),
    ]);

    const ga4Error = !narrivaSessions ? "GA4 API unavailable or credentials not configured" : undefined;
    const partialData = !!ga4Error;

    const nSessions = safeSessions(narrivaSessions);
    const nServices = safeSessions(narrivaServices);
    const nFormView = safeEventCount(narrivaFormView);
    const nFormSubmit = safeEventCount(narrivaFormSubmit);
    const nStep3 = nFormView > 0 ? nFormView : nFormSubmit;

    const narriva = [
      { step: 1, name: "Sessions (narriva.com)", count: nSessions, dropoffRate: 0 },
      { step: 2, name: "Engaged (visited /services or /how-it-works)", count: nServices, dropoffRate: dropoff(nSessions, nServices) },
      { step: 3, name: "Submission form view (form_submit on /submit)", count: nStep3, dropoffRate: dropoff(nServices, nStep3) },
      { step: 4, name: "Form completed", count: nFormSubmit, dropoffRate: dropoff(nStep3, nFormSubmit) },
    ];

    const kSessions = safeSessions(kekereSessions);
    const kEngaged = safeSessions(kekereEngaged);
    const kAuthPage = safePageview(kekereAuthPage);
    const kSignedUp = safeEventCount(kekereSignedUp);

    const kekere = [
      { step: 1, name: "Sessions (kekere.narriva.com)", count: kSessions, dropoffRate: 0 },
      { step: 2, name: "Engaged (engagement_time > 0)", count: kEngaged, dropoffRate: dropoff(kSessions, kEngaged) },
      { step: 3, name: "Sign-up page viewed (/auth)", count: kAuthPage, dropoffRate: dropoff(kEngaged, kAuthPage) },
      { step: 4, name: "Signed up (sign_up event)", count: kSignedUp, dropoffRate: dropoff(kAuthPage, kSignedUp) },
      { step: 5, name: "First read (story_read event)", count: 0, dropoffRate: null, note: "TODO: implement story_read custom event in Kekere story reader" },
      { step: 6, name: "First unlock (story_unlock event)", count: 0, dropoffRate: null, note: "TODO: implement story_unlock custom event in Kekere unlock flow" },
      { step: 7, name: "First top-up (wallet_topup event)", count: 0, dropoffRate: null, note: "TODO: implement wallet_topup custom event in Kekere wallet component" },
    ];

    return NextResponse.json({
      narriva,
      kekere,
      ...(partialData ? { partialData, ga4Error } : {}),
    });
  },
  { roles: ["ADMIN"] },
);
