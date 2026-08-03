export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { createDeliverable, getProjectDeliverables } from "@/lib/data/admin-deliverables";

export const GET = withAuth(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
    const deliverables = await getProjectDeliverables(projectId);
    return NextResponse.json({ deliverables });
  },
  { roles: ["ADMIN"] },
);

export const POST = withAuth(
  async (request) => {
    const body = await request.json();
    const deliverable = await createDeliverable(body);
    return NextResponse.json({ deliverable }, { status: 201 });
  },
  { roles: ["ADMIN"] },
);
