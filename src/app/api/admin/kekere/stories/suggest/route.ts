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

2. HOOK — one sentence, max 150 characters. This is the single hardest part of the job to get right, so read this section carefully before you write anything.

   WHERE IT APPEARS, AND WHY THAT MATTERS: the app renders your hook literally in italics inside quotation marks — "like this" — under the story's title, everywhere the story is shown. A reader sees it exactly as if it were a line quoted out of the story itself. That fact is the whole definition of what a hook line is. You are not writing copy ABOUT the story for a reader standing outside it. You are handing them one real sentence that could have come from INSIDE it.

   WHAT A HOOK LINE IS:
   - A genuine moment, image, line of dialogue, or private thought that could plausibly sit on an actual page of this story, in its narrator's or a character's voice.
   - Something a reader would believe you lifted from the text, even when you actually wrote it yourself to sharpen or compress a real beat that's already there.
   - Anchored to one concrete, specific detail from THIS story — a name, an object, an action, a stake — so specific it could not be pasted onto any other story, even one with the same tag.

   WHAT A HOOK LINE IS NOT — if what you've written matches any of these, throw it out and try again:
   - A synopsis or logline that describes the plot from the outside: "A young woman must choose between her family's honor and her own ambition." That's a pitch. Nobody says a sentence like that out loud inside a story.
   - Ad copy or a blurb: "A gripping tale of love, loss, and betrayal that will keep you hooked until the last page."
   - A mood label wearing a sentence's clothes: "A dark and haunting exploration of grief," "A darkly comic look at office politics."
   - Scene-setting throat-clearing or a title restatement: "In a world where...", "This is the story of...", "Follow [name] as...", "[Title] follows a woman who..."
   - Narration that summarizes a character's arc from a bird's-eye view instead of dropping the reader into one real second of it: "She realizes too late that trust was never really an option" is a summary of an insight; "She counted the money twice before she understood whose blood was on it" is the actual moment. Always write the second kind.

   THE TEST before you answer: could this sentence, verbatim, sit on an actual page of the story — spoken, thought, or narrated in the moment — without a reader blinking at it? If it only works as a caption describing the story from outside, it has failed, no matter how punchy it sounds.

   Two more rules, without exception:
   - Match the story's own tone exactly. A horror story earns an unsettling hook, never a witty one. A comedy earns a genuinely funny line, not a flat description of what happens. A grief or heartbreak story earns quiet, precise devastation — not melodrama, not a joke.
   - No quotation marks in your answer (the app adds those). No em-dash cliché ("not just X — it's Y"). No generic superlatives like "unforgettable," "gripping," or "powerful" — those are what a hook fails to be, not what it says.

   Examples for calibration only — do not reuse these, write one specific to the actual story below:
   - BAD (logline): "A woman fights to reclaim her family's honor after a public betrayal."
     GOOD (real moment): "She wore the same red dress to his wedding that she'd worn to bury her mother."
   - BAD (blurb): "This gripping thriller will leave you breathless until the final page."
     GOOD (real moment): "The gun was already in his hand before he remembered picking it up."
   - BAD (mood label): "A darkly comic look at Lagos office politics."
     GOOD (real moment): "HR called it a restructuring; everyone else called it what it was — revenge."

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
