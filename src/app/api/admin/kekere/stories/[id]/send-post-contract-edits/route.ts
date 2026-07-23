export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { sendPostContractEditsToWriter, ReviewFlowError } from "@/lib/data/kekere-review-flow";

const schema = z.object({
  summaryNote: z.string().max(2000).optional(),
});

/**
 * Stage 2 of sendEditsToWriter: the editor has made tracked changes to an
 * already-ACCEPTED (contract signed) story and sends them to the writer for
 * one more approval pass before publishing. Deliberately a separate route
 * from the pre-contract one — publishing terms are locked in once the
 * contract is signed, so this never touches cowrieCost/tier/tags/cover.
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
      const { writerName } = await sendPostContractEditsToWriter(id, parsed.data);
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
