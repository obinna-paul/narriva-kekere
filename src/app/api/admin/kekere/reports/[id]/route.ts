export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { resolveReport } from "@/lib/data/kekere-reports";

const actionSchema = z.object({
  action: z.enum(["resolve", "dismiss"]),
  notes: z.string().max(500).optional(),
});

export const PUT = withAuth(
  async (request, session, { params }: { params: { id: string } }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const ok = await resolveReport(params.id, session.user.id, parsed.data.action, parsed.data.notes);
    if (!ok) {
      return NextResponse.json({ error: "Report not found or already resolved" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] }
);
