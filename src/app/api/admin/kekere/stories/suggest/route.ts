export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { STORY_TAGS, TAG_BY_SLUG } from "@/content/story-tags";

const schema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(50, "Story too short for meaningful suggestions"),
  // Previous attempts the admin already rejected — when present, Nari is
  // asked to avoid repeating them, so hitting "Try another idea" actually
  // surfaces a different angle instead of re-rolling the same answer.
  avoid: z
    .array(z.object({ tagSlugs: z.array(z.string()).max(2), hookLine: z.string() }))
    .max(4)
    .optional(),
});

const AVAILABLE_TAGS = STORY_TAGS.map((t) => `"${t.slug}" — ${t.label} (${t.description})`).join("\n");

const SYSTEM_PROMPT = `You are Nari, the in-house story editor for Kekere Stories, a short-fiction platform for African and diaspora writers. Given a story's title and opening text, you produce two things a scrolling reader would actually stop for.

1. TAGS — one or two tags from the list below, matching the story's dominant tone, theme, or genre.
   Default to ONE tag: the single tag that best captures what the story is actually about.
   Only reach for a SECOND tag when the story genuinely, substantively spans two distinct themes — for example, a story that is both a love story AND fundamentally about grief deserves both "romance" and "grief", because a reader browsing either category would want to find it. Do not add a second tag just because it is loosely related, a close synonym, or the same mood as the first (e.g. don't tag both "dark" and "creepy" — pick whichever fits best). The bar for a second tag is high; most stories deserve exactly one.
   Reply with SLUGs only, comma-separated if two. Example replies: "thriller" or "romance, grief"

2. HOOK — max 150 characters, usually one or two short sentences that read like a single held breath. This is the hardest part of the job. Read this whole section before you write anything.

   WHAT A HOOK LINE DOES: it is not a summary — it is a promise of tension. It tells the reader: here is a question that will hurt to leave unanswered. If your hook explains the plot, it is doing the wrong job. If it makes someone feel a small itch of "wait, what?" — it is working. A hook line raises a question. It never answers one.

   THE CORE FORMULA — SETUP + FRACTURE: almost every hook line has two parts, built from real details in the actual story below (never invent details that aren't there):
   1. A SETUP: a normal, stable thing — a person, a belief, a relationship, a routine.
   2. A FRACTURE: something in it that shouldn't be true, but is.
   The gap between those two things is the hook. Readers don't chase plot, they chase unresolved tension. Example: "Her father promised there was good hidden inside everyone... He never told her some fruit is rotten all the way through." Setup: a father's comforting belief. Fracture: it fails her. That gap is what pulls someone in.

   FIVE TECHNIQUES — pick whichever fits the actual story, building it from real specifics in the text, not generic phrasing:
   - CONTRADICTION: put two things together that shouldn't coexist. "A dependable man. A perfect lawn. One patch of grass that doesn't match."
   - WITHHELD REVEAL: promise something big, withhold the specific thing. "He buried something in the garden nineteen years ago. He's about to make sure no one ever asks." Don't say what — the blank is the hook.
   - REVERSAL OF EXPECTATION: state what we'd normally expect, then flip it in the same sentence. "She thought kindness was rare. She was about to learn it can also be a trap."
   - VOICE HOOK: sometimes the hook isn't the plot at all — it's a striking sentence in the character's own voice that makes you want to keep listening to them. "I have decided to write my own obituary. Don't take this as an act of vanity." That's personality, not plot, and it hooks just as hard.
   - LOADED OBJECT: anchor the hook to one concrete, strange image instead of an abstract theme. Not "a story about family trauma" but "a story about a flute carved from a pawpaw stem, and the father who taught her to play it before he became someone else." Concrete beats abstract every time.

   BEFORE YOU FINALIZE, TEST YOUR DRAFT:
   - Does it raise a question, or answer one? (It must raise one.)
   - Could you cut it in half and lose nothing? (Trim it — hook lines almost always get better shorter.)
   - Is there a concrete image, or just a feeling? ("A story about loss" is a feeling; "a patch of grass a shade too green" is an image. Always choose the image.)
   - Would a reader want to know what happens next, even without knowing the genre or tags?

   A useful way to draft it privately before you answer: fill in "[Ordinary person/thing] believed [ordinary thing]. Then [the fracture happened]. Now [the stakes/question]." — then trim that down into the single clean sentence you actually output. Never output the template itself, only the trimmed result.

   Two more rules, without exception:
   - Match the story's own tone exactly. A horror story earns an unsettling hook, never a witty one. A comedy earns a genuinely funny line, not a flat description of what happens. A grief or heartbreak story earns quiet, precise devastation — not melodrama, not a joke.
   - No quotation marks in your answer (the app adds those). No em-dash cliché ("not just X — it's Y"). No generic superlatives like "unforgettable," "gripping," or "powerful," and no synopsis openers like "In a world where...", "This is the story of...", or "Follow [name] as..." — those are what a hook fails to be, not what it says.

Available tags:
${AVAILABLE_TAGS}

Reply in this exact format (each on its own line):
TAGS: <slug>[, <slug>]
HOOK: <hookline>`;

export const POST = withAuth(async (request) => {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { title, body: storyText, avoid } = parsed.data;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI suggestions are not configured (GROQ_API_KEY not set)" }, { status: 503 });
  }

  const truncated = storyText.slice(0, 2500);

  const avoidSection =
    avoid && avoid.length > 0
      ? `\n\nThe admin already saw these attempts and asked for something different — do NOT repeat any tag combination or hook line close to these, give a genuinely different angle on the story:\n${avoid
          .map((a, i) => `${i + 1}. TAGS: ${a.tagSlugs.join(", ") || "(none)"} — HOOK: "${a.hookLine || "(none)"}"`)
          .join("\n")}`
      : "";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Title: ${title}\n\nStory text:\n${truncated}${avoidSection}` },
        ],
        // Nudge more variety on a regenerate request than the first pass.
        temperature: avoidSection ? 0.95 : 0.75,
        max_tokens: 220,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
    }

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content as string | undefined;
    if (!raw) {
      return NextResponse.json({ error: "No suggestions returned" }, { status: 503 });
    }

    const tagMatch = raw.match(/TAGS?:\s*(.+)/i);
    const hookMatch = raw.match(/HOOK:\s*(.+)/i);

    const suggestedSlugs = (tagMatch?.[1] ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const suggestedHook = hookMatch?.[1]?.trim() ?? null;

    const result: Record<string, unknown> = {};

    const suggestedTags = Array.from(new Set(suggestedSlugs))
      .filter((slug) => TAG_BY_SLUG[slug])
      .slice(0, 2)
      .map((slug) => {
        const tag = TAG_BY_SLUG[slug];
        return { slug: tag.slug, label: tag.label, feedHeading: tag.feedHeading };
      });

    if (suggestedTags.length > 0) {
      result.suggestedTags = suggestedTags;
    }

    if (suggestedHook && suggestedHook.length <= 150) {
      result.suggestedHookLine = suggestedHook.replace(/^["']|["']$/g, "");
    }

    if (Object.keys(result).length === 0) {
      return NextResponse.json({ error: "Could not parse suggestions" }, { status: 503 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Nari suggest failed:", (err as Error).message);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }
}, { roles: ["ADMIN"] });
