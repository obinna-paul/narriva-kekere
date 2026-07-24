export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { setPublishingTerms, finalizeContract, ReviewFlowError } from "@/lib/data/kekere-review-flow";

const publishSchema = z.object({
  cowrieCost: z.number().int().min(1).max(10),
  expiresInDays: z.number().int().min(3).max(60).default(14),
});

/**
 * Approve a story at the initial Story Review Queue stage: the writer's
 * cowrie price is the only term that's contractual (the agreement text
 * states "Agreed Cowrie Price: X cowries"), so it's the only thing collected
 * here. Cover, tier, tags, and mature-content rating are all set later, once
 * the writer has signed and the story enters the To Be Published queue.
 */
export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { id } = params as { id: string };

    const story = await prisma.story.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
    if (story.status !== "SUBMITTED" && story.status !== "REVISIONS_REQUESTED") {
      return NextResponse.json({ error: "Story must be submitted or in revisions to publish" }, { status: 400 });
    }

    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { cowrieCost, expiresInDays } = parsed.data;

    try {
      await setPublishingTerms(id, { cowrieCost });
      const result = await finalizeContract(id, { expiresInDays });
      return NextResponse.json({
        success: true,
        contractId: result.contractId,
        writerName: result.writerName,
        expiresAt: result.expiresAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof ReviewFlowError) {
        const status = error.code === "not_found" ? 404 : error.code === "no_template" ? 500 : 409;
        return NextResponse.json({ error: error.message }, { status });
      }
      throw error;
    }
  },
  { roles: ["ADMIN"] },
);
