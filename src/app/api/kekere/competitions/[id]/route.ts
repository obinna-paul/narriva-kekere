export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import {
  getCompetitionById,
  getCompetitionBySlug,
  getPublicWinners,
  updateCompetition,
} from "@/lib/data/kekere-competitions";

/** Accepts either the cuid or the slug — the public page works in slugs
 * (/competitions/[slug]), admin tooling works in ids; same pattern as the
 * Narriva authors/[id] route from Phase 7. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const competition =
    (await getCompetitionById(params.id)) ?? (await getCompetitionBySlug(params.id));

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  // Entries (winners) are only ever included once COMPLETE — see
  // getPublicWinners. Before that, this is just the competition's own
  // fields, no peeking at who's entered.
  const winners = await getPublicWinners(competition.id);
  return NextResponse.json({ competition, winners });
}

const updateSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  theme: z.string().min(1).optional(),
  themeDescription: z.string().min(1).optional(),
  deadline: z.coerce.date().optional(),
  prizeDescription: z.string().min(1).optional(),
  wordCountLimit: z.number().int().positive().optional(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "JUDGING", "COMPLETE"]).optional(),
});

export const PUT = withAuth(
  async (request, _session, { params }: { params: { id: string } }) => {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const competition = await updateCompetition(params.id, parsed.data);
    return NextResponse.json({ competition });
  },
  { roles: ["ADMIN"] }
);
