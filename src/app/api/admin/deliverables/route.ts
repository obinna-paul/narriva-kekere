export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createDeliverable, getProjectDeliverables } from "@/lib/data/admin-deliverables";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const deliverables = await getProjectDeliverables(projectId);
  return NextResponse.json({ deliverables });
}

export async function POST(request: Request) {
  const body = await request.json();
  const deliverable = await createDeliverable(body);
  return NextResponse.json({ deliverable }, { status: 201 });
}
