import { NextResponse } from "next/server";
import { z } from "zod";
import { matchNariFAQ } from "@/lib/nari/match";
import { NARI_FALLBACK_MESSAGE } from "@/content/nari-faq";

const askSchema = z.object({
  question: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = askSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const match = matchNariFAQ(parsed.data.question);

  // No match (or an ambiguous one) means the question is outside Nari's
  // fixed scope — return the exact fallback copy, never an improvised
  // answer. The "Book a call" CTA is rendered by the widget whenever
  // matched is false, not driven by any text-matching on the message.
  if (!match) {
    return NextResponse.json({
      matched: false,
      answer: NARI_FALLBACK_MESSAGE,
      links: [{ label: "Book a call", href: "/contact" }],
    });
  }

  return NextResponse.json({
    matched: true,
    answer: match.entry.answer,
    links: match.entry.links ?? [],
  });
}
