export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * What is the deployment that is actually answering this request?
 *
 * Written after an afternoon of arguing with a production error that turned
 * out not to be a code error at all: the running deployment could not see
 * DATABASE_URL or NEXTAUTH_SECRET, while the dashboard showed both set and
 * ticked for Production. That is the shape of the bug you cannot debug from
 * the outside — the app 500s, the build is green, and the settings page
 * agrees with you. The only way through it is to ask the process itself.
 *
 * Deliberately unauthenticated. Every auth path in this app depends on
 * NEXTAUTH_SECRET, so gating this behind a session means it fails exactly
 * when it would have been useful. To make that safe it reports only whether
 * a name is set, never a value, plus the build identifiers Vercel already
 * puts in response headers. Nothing here is a secret; the point is to prove
 * WHICH project and WHICH build is serving the domain, which is what
 * distinguishes "the vars are missing" from "you set them on the other
 * project".
 */

/** Without these the app cannot serve a signed-in page at all. */
const REQUIRED = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
] as const;

/** Set these and a feature works; leave one out and that feature degrades,
 *  but the app still runs. Listed so a half-configured deployment is
 *  visible before a reader finds it. */
const OPTIONAL = [
  "DIRECT_URL",
  "GROQ_API_KEY",
  "RESEND_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CLOUDFLARE_R2_ENDPOINT",
  "CLOUDFLARE_R2_BUCKET",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "PAYSTACK_SECRET_KEY",
  "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "CRON_SECRET",
] as const;

function presence(names: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(names.map((n) => [n, Boolean(process.env[n])]));
}

export async function GET() {
  const env = presence(REQUIRED);
  const missingRequired = REQUIRED.filter((n) => !env[n]);

  // A name being set is not the same as it pointing anywhere. One trivial
  // round trip separates "no connection string" from "connection string to a
  // database that won't take us".
  let database: { reachable: boolean; error?: string } = { reachable: false };
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { reachable: true };
  } catch (err) {
    // The message, not the stack, and not the connection string — Prisma's
    // errors name the problem ("Can't reach database server", "Environment
    // variable not found") without echoing credentials back.
    database = { reachable: false, error: err instanceof Error ? err.message.slice(0, 300) : "unknown" };
  }

  return NextResponse.json(
    {
      ok: missingRequired.length === 0 && database.reachable,
      // Which build is answering. If this sha isn't the commit you expect,
      // nothing else on this page matters — you're looking at the wrong
      // deployment, or the wrong project owns the domain.
      deployment: {
        vercelEnv: process.env.VERCEL_ENV ?? null,
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? null,
        branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
        repo: process.env.VERCEL_GIT_REPO_SLUG ?? null,
        region: process.env.VERCEL_REGION ?? null,
        nodeEnv: process.env.NODE_ENV,
      },
      required: env,
      missingRequired,
      optional: presence(OPTIONAL),
      database: { ...database, checkedInMs: Date.now() - startedAt },
    },
    { status: missingRequired.length === 0 && database.reachable ? 200 : 503 },
  );
}
