export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { writerAcceptEdits, ReviewFlowError } from "@/lib/data/kekere-review-flow";

/** Writer accepts the admin's proposed edits → story advances to the contract. */
export const POST = withAuth(async (_request, session, { params }: { params: { id: string } }) => {
  try {
    const result = await writerAcceptEdits(params.id, session.user.id);
    return NextResponse.json({ success: true, contractId: result.contractId });
  } catch (error) {
    if (error instanceof ReviewFlowError) {
      const status = error.code === "not_found" ? 404 : error.code === "forbidden" ? 403 : error.code === "no_template" ? 500 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
});
