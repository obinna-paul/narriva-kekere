import { NextResponse } from "next/server";
import { z } from "zod";
import type { CompetitionStatus } from "@prisma/client";
import { withAuth } from "@/lib/auth/middleware";
import { createCompetition, listCompetitions } from "@/lib/data/kekere-competitions";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") as CompetitionStatus | null) ?? undefined;
  const competitions = await listCompetitions({ status });
  return NextResponse.json({ competitions });
}

const competitionSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  theme: z.string().min(1),
  themeDescription: z.string().min(1),
  deadline: z.coerce.date(),
  prizeDescription: z.string().min(1),
  wordCountLimit: z.number().int().positive(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "JUDGING", "COMPLETE"]).optional(),
});

export const POST = withAuth(
  async (request) => {
    const body = await request.json();
    const parsed = competitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const competition = await createCompetition(parsed.data);
    return NextResponse.json({ competition }, { status: 201 });
  },
  { roles: ["ADMIN"] }
);
