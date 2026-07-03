export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { updateDeliverable } from "@/lib/data/admin-deliverables";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const deliverable = await updateDeliverable(params.id, body);
  return NextResponse.json({ deliverable });
}
