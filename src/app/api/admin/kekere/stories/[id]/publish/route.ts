export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { setPublishingTerms, finalizeContract, ReviewFlowError } from "@/lib/data/kekere-review-flow";

const publishSchema = z.object({
  cowrieCost: z.number().int().min(1).max(10),
  tier: z.enum(["STANDARD", "FEATURED", "CHAMPION"]),
  tagIds: z.array(z.string()).min(1, "Select at least one tag").max(2, "Select at most two tags"),
  /** Versioned Cloudinary ref — if omitted the existing coverImageRef is kept */
  coverImageRef: z.string().optional(),
  expiresInDays: z.number().int().min(3).max(60).default(14),
  /** Gates the reader behind an 18+ interstitial and shows the mature-content
   * badge everywhere the story is listed. Omitted means "leave as-is." */
  isAdult: z.boolean().optional(),
});

/**
 * The no-editorial-changes fast path: an admin approves a story as-is (or with
 * edits already baked into the working copy) and sends the publishing contract
 * straight away. When the admin has proposed edits the writer must approve
 * first, the review queue calls send-to-writer instead (CHANGES_PROPOSED).
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

    const { cowrieCost, tier, tagIds, coverImageRef, expiresInDays, isAdult } = parsed.data;

    try {
      await setPublishingTerms(id, { cowrieCost, tier, tagIds, coverImageRef, isAdult });
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
