export const dynamic = "force-dynamic";

/** Reading a whole story and writing it back as beats takes longer than the
 *  tag pass — the model is asked to hold the middle of the story, not just
 *  match an opening against a list. 55s outbound, declared above it so a slow
 *  response lands in this route's own error path rather than the platform
 *  killing the function and returning a raw gateway error. */
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { docToPlainText } from "@/lib/tiptap/doc-utils";
import { checkRateLimit } from "@/lib/rate-limit";

/** Groq quota is per-account and shared with reader-facing Kemi, so an
 *  editor holding down this button would be spending readers' capacity, not
 *  their own. Generous enough that nobody reviewing a real queue ever sees
 *  it — a story is read once, not thirty times an hour. */
const RATE_LIMIT = { limit: 30, windowMs: 60 * 60 * 1000 };

/** The middle is where the plot actually turns, so unlike the tag pass —
 *  which only needs setup and tone — this samples the body across its whole
 *  length. Most Kekere stories fit under the budget whole and are never
 *  excerpted at all. */
const WHOLE_STORY_BUDGET = 28000;
const OPENING_LEN = 13000;
const MIDDLE_LEN = 8000;
const ENDING_LEN = 7000;

function buildExcerpt(text: string): { excerpt: string; truncated: boolean } {
  if (text.length <= WHOLE_STORY_BUDGET) return { excerpt: text, truncated: false };

  const opening = text.slice(0, OPENING_LEN);
  const midpoint = Math.floor(text.length / 2);
  const middle = text.slice(midpoint - Math.floor(MIDDLE_LEN / 2), midpoint + Math.floor(MIDDLE_LEN / 2));
  const ending = text.slice(-ENDING_LEN);

  return {
    excerpt: `${opening}\n\n[... skipping ahead ...]\n\n${middle}\n\n[... skipping ahead ...]\n\n${ending}`,
    truncated: true,
  };
}

function asStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim().slice(0, 300))
    .slice(0, max);
}

export const POST = withAuth(
  async (_request, session, { params }) => {
    const { id } = params as { id: string };

    const rateLimit = await checkRateLimit(`story-summary:${session.user.id}`, RATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many summaries in the last hour. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });

    const story = await prisma.story.findUnique({
      where: { id },
      // The editorial working copy when one exists, so the summary describes
      // the version on screen rather than a superseded submission.
      select: { title: true, genre: true, hookLine: true, body: true, editedBody: true },
    });

    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    const bodyText = docToPlainText((story.editedBody ?? story.body) as never);
    if (bodyText.trim().length < 200) {
      return NextResponse.json({ error: "There isn't enough text here to summarise yet." }, { status: 400 });
    }

    const { excerpt, truncated } = buildExcerpt(bodyText);

    // Deliberately NOT Kemi's reader prompt. Hers forbids revealing endings,
    // twists and deaths — the exact opposite of what an editor deciding
    // whether to publish needs. This is an editorial read, spoilers required.
    const prompt = `You are reading a short story on behalf of a commissioning editor at Kekere Stories, an African short-fiction platform. The editor has a queue of submissions and needs to know what is in this one before they spend twenty minutes reading it themselves.

You are NOT writing marketing copy, a blurb, or a hook. You are NOT protecting the editor from spoilers — they are deciding whether to publish this, so they need the ending, the twist, and anything the story is hiding. Say what actually happens.

Title: ${story.title}
Genre: ${story.genre}
Hook line on file: ${story.hookLine ?? "(none)"}
${truncated ? "\nNOTE: this story was too long to send whole. You are seeing the opening, a section from the middle, and the ending, with gaps marked. Say so in `gaps` if a gap leaves you genuinely unsure what happens between two points — do not guess and present it as fact.\n" : ""}
Story:
${excerpt}

---

Produce, in plain unhurried English:

1. "synopsis" — 3 to 5 sentences covering the whole plot from beginning to end, INCLUDING how it ends and any twist. Who is this about, what do they want, what goes wrong, what happens to them. Name the actual characters. No teasing, no "you'll have to read to find out".

2. "beats" — 4 to 7 short lines, in story order, each one a thing that happens. Events, not themes. "Adaeze finds the letter in her mother's coat" not "the story explores memory". Keep each under 15 words.

3. "ending" — one sentence, the final state of things. This repeats the end of the synopsis on purpose, so the editor can see the landing on its own.

4. "contentFlags" — an array of short phrases naming anything on the page that an editor needs to know about before publishing: explicit sexual content, graphic violence, suicide or self-harm, child abuse, detailed drug use, animal cruelty, slurs. Only flag what is actually DEPICTED on the page, not what is alluded to or referenced in passing. If the story is clean, return an empty array. Do not invent flags to seem thorough.

5. "looseEnds" — an array of short phrases naming plot threads the story raises and never resolves, or places where the plot does not add up. This is the one place you may be critical, and only about coherence — not prose quality, not whether you liked it, not whether it is commercial. If everything resolves, return an empty array.

6. "gaps" — an array of short phrases naming anything you could not determine because a section was skipped. Empty array if you saw the whole story or the gaps did not matter.

Be accurate above all. If you are not sure something happened, do not assert it. An editor acting on a wrong summary is worse than one who reads the story themselves.

Respond ONLY with valid JSON in this exact shape:
{
  "synopsis": "...",
  "beats": ["...", "..."],
  "ending": "...",
  "contentFlags": [],
  "looseEnds": [],
  "gaps": []
}

No markdown fences. No commentary. JSON only.`;

    let res: Response;
    try {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          temperature: 0.2,
          max_tokens: 2000,
          reasoning_effort: "low",
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(55000),
      });
    } catch {
      // Timeout or network failure — distinct from the model answering badly.
      return NextResponse.json({ error: "Kemi took too long reading this one." }, { status: 504 });
    }

    if (!res.ok) {
      const err = await res.text();
      console.error("[summarise] Groq error:", err);
      return NextResponse.json({ error: "AI request failed" }, { status: 502 });
    }

    const groqData = await res.json();
    const raw: string = groqData.choices?.[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

    let parsed: {
      synopsis?: string;
      beats?: unknown;
      ending?: string;
      contentFlags?: unknown;
      looseEnds?: unknown;
      gaps?: unknown;
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Kemi's answer came back unreadable. Try again." }, { status: 502 });
    }

    const synopsis = typeof parsed.synopsis === "string" ? parsed.synopsis.trim() : "";
    if (!synopsis) {
      return NextResponse.json({ error: "Kemi couldn't get a read on this one. Try again." }, { status: 502 });
    }

    return NextResponse.json({
      synopsis: synopsis.slice(0, 2000),
      beats: asStringArray(parsed.beats, 8),
      ending: typeof parsed.ending === "string" ? parsed.ending.trim().slice(0, 400) : null,
      contentFlags: asStringArray(parsed.contentFlags, 8),
      looseEnds: asStringArray(parsed.looseEnds, 6),
      gaps: asStringArray(parsed.gaps, 4),
      truncated,
    });
  },
  { roles: ["ADMIN"] },
);
