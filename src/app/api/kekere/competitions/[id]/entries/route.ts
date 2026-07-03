export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { listEntriesForAdmin, selectWinners } from "@/lib/data/kekere-competitions";

export const GET = withAuth(
  async (_request, _session, { params }: { params: { id: string } }) => {
    const entries = await listEntriesForAdmin(params.id);
    return NextResponse.json({ entries });
  },
  { roles: ["ADMIN"] }
);

// Not in the literal spec (which only lists GET for /entries), but the
// admin "select winners" feature needs somewhere to post placements —
// added as the natural mutation endpoint alongside the GET above.
const placementsSchema = z.object({
  placements: z.array(z.object({ entryId: z.string().min(1), placement: z.number().int().min(1).max(3).nullable() })),
});

export const PUT = withAuth(
  async (request, _session, { params }: { params: { id: string } }) => {
    const body = await request.json();
    const parsed = placementsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const competition = await selectWinners(params.id, parsed.data.placements);
    return NextResponse.json({ competition });
  },
  { roles: ["ADMIN"] }
);
