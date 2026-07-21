export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { sendEditsToWriter, ReviewFlowError } from "@/lib/data/kekere-review-flow";

const schema = z.object({
  cowrieCost: z.number().int().min(1).max(10),
  tier: z.enum(["STANDARD", "FEATURED", "CHAMPION"]),
  tagIds: z.array(z.string()).min(1, "Select at least one tag").max(2, "Select at most two tags"),
  coverImageRef: z.string().optional(),
  isAdult: z.boolean().optional(),
  summaryNote: z.string().max(2000).optional(),
});

/**
 * Admin sends their editorial working copy + inline comments to the writer for
 * approval (CHANGES_PROPOSED). Publishing terms are captured now so acceptance
 * can go straight to the contract; nothing is promoted or published yet.
 */
export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { id } = params as { id: string };

    const raw = await request.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    try {
      const { writerName } = await sendEditsToWriter(id, parsed.data);
      return NextResponse.json({ success: true, writerName });
    } catch (error) {
      if (error instanceof ReviewFlowError) {
        const status = error.code === "not_found" ? 404 : 409;
        return NextResponse.json({ error: error.message }, { status });
      }
      throw error;
    }
  },
  { roles: ["ADMIN"] },
);
