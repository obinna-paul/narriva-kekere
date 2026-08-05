export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listCompetitions } from "@/lib/data/kekere-competitions";

/**
 * The competitions a writer can enter right now — what the story editor's
 * submit step offers alongside "submit for review".
 *
 * Narrower than GET /api/kekere/competitions?status=OPEN on purpose: it also
 * drops anything past its deadline, so the editor never offers a prize that
 * submitStoryToCompetition would immediately reject. Returns only what the
 * submit UI needs (title, deadline, word-count range) — deliberately not
 * entries, which would leak who's in the running mid-judging.
 */
export async function GET() {
  const open = await listCompetitions({ status: "OPEN" });
  const now = Date.now();

  const enterable = open
    .filter((c) => c.deadline.getTime() >= now)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      deadline: c.deadline.toISOString(),
      wordCountMin: c.wordCountMin,
      wordCountLimit: c.wordCountLimit,
    }));

  return NextResponse.json({ competitions: enterable });
}
