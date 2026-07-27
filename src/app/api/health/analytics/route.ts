export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  getWriterOverview,
  getWriterEarningsSummary,
  getWriterEarningsSeries,
  getWriterFollowerSeries,
  getWriterStoryBreakdown,
} from "@/lib/data/kekere-writer-analytics";

/**
 * Run the Analytics & Earnings data path one function at a time and say what
 * actually went wrong.
 *
 * The page fetches all five of these in a single Promise.all, so one
 * rejection takes down the whole render and Next replaces it with
 * "Application error: a server-side exception has occurred" plus a digest.
 * The digest is a hash — it identifies the error without describing it, and
 * there is no way to turn one back into a message from the outside.
 *
 * This runs the same five calls in isolation, catches each separately, and
 * returns the real name, message and Prisma error code. That turns "one of
 * five things broke, unknown which" into a line you can read.
 *
 * Admin-only: error messages can name columns and constraints, which is
 * exactly what makes them useful and exactly why they don't belong in a
 * reader's response. `?userId=` lets an admin probe a specific writer, since
 * a fault that only appears for one account's data is invisible when you
 * only ever test your own.
 */

interface ProbeResult {
  ok: boolean;
  ms: number;
  error?: { name: string; message: string; code?: string };
}

async function probe(fn: () => Promise<unknown>): Promise<ProbeResult> {
  const startedAt = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - startedAt };
  } catch (err) {
    const e = err as { name?: string; message?: string; code?: string };
    return {
      ok: false,
      ms: Date.now() - startedAt,
      error: {
        name: e.name ?? "Error",
        // Prisma's messages are multi-line and include the offending column
        // or table by name — the whole point of reading them.
        message: (e.message ?? String(err)).slice(0, 1200),
        code: e.code,
      },
    };
  }
}

export const GET = withAuth(
  async (request, session) => {
    const userId = new URL(request.url).searchParams.get("userId") ?? session.user.id;

    // Sequential, not Promise.all — the page's own parallelism is what hides
    // which call failed, and a probe that reproduces that is useless.
    const results: Record<string, ProbeResult> = {
      getWriterOverview: await probe(() => getWriterOverview(userId)),
      getWriterEarningsSummary: await probe(() => getWriterEarningsSummary(userId)),
      getWriterEarningsSeries: await probe(() => getWriterEarningsSeries(userId, 30)),
      getWriterFollowerSeries: await probe(() => getWriterFollowerSeries(userId, 30)),
      getWriterStoryBreakdown: await probe(() => getWriterStoryBreakdown(userId)),
    };

    const failed = Object.entries(results)
      .filter(([, r]) => !r.ok)
      .map(([name]) => name);

    return NextResponse.json({
      userId,
      ok: failed.length === 0,
      failed,
      results,
    });
  },
  { roles: ["ADMIN"] },
);
