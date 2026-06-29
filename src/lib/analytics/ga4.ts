import { createSign } from "node:crypto";

const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GA4_API_BASE = "https://analyticsdata.googleapis.com/v1beta";

let cachedToken: { token: string; expiresAt: number } | null = null;

function getCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID ?? "";
  return { email, key, propertyId };
}

async function getAccessToken(saEmail: string, privateKey: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: saEmail,
    scope: GA4_SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedClaim = Buffer.from(JSON.stringify(claim)).toString("base64url");
  const signTarget = `${encodedHeader}.${encodedClaim}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signTarget);
  signer.end();
  const signature = signer.sign(privateKey, "base64url");

  const jwt = `${signTarget}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 auth failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 120) * 1000,
  };

  return data.access_token;
}

export interface GA4ReportRequest {
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  dateRanges: { startDate: string; endDate: string }[];
  dimensionFilter?: unknown;
  orderBys?: unknown[];
  limit?: number;
  offset?: number;
  metricAggregations?: string[];
  keepEmptyRows?: boolean;
  cohortSpec?: unknown;
}

export interface GA4ReportResponse {
  dimensionHeaders?: { name: string }[];
  metricHeaders?: { name: string; type: string }[];
  rows?: {
    dimensionValues?: { value: string }[];
    metricValues?: { value: string }[];
  }[];
  rowCount?: number;
  metadata?: unknown;
}

export async function runGA4Report(request: GA4ReportRequest): Promise<GA4ReportResponse | null> {
  const { email, key, propertyId } = getCredentials();

  if (!email || !key || !propertyId) {
    console.warn("[ga4] GA4 credentials not configured — skipping report");
    return null;
  }

  try {
    const token = await getAccessToken(email, key);

    const res = await fetch(
      `${GA4_API_BASE}/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[ga4] API error ${res.status}:`, text.slice(0, 300));
      return null;
    }

    return (await res.json()) as GA4ReportResponse;
  } catch (err) {
    console.error("[ga4] Report failed:", (err as Error).message);
    return null;
  }
}

export function getPropertyId(): string {
  return process.env.GOOGLE_ANALYTICS_PROPERTY_ID ?? "";
}
