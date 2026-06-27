import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { updateDeliverable } from "@/lib/data/admin-deliverables";

export const PUT = withAuth(async (request, _session, { params }: { params: { id: string } }) => {
  const body = await request.json();
  const { status, authorComment } = body;

  if (!status || !["APPROVED", "CHANGES_REQUESTED"].includes(status)) {
    return NextResponse.json({ error: "status must be APPROVED or CHANGES_REQUESTED" }, { status: 400 });
  }

  await updateDeliverable(params.id, { status, authorComment });
  return NextResponse.json({ ok: true });
});
