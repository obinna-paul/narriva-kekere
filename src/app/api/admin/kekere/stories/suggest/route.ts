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

2. HOOK — one sentence, max 150 characters, that makes a stranger tap in. Follow these rules without exception:
   - Be SPECIFIC to this story. Reference an actual detail, choice, or stake from the text itself. If your hook could be pasted onto a different story with the same tag and still make sense, it has failed.
   - Match the story's own tone exactly. A horror story earns an unsettling hook, never a witty one. A comedy earns a genuinely funny line, not a flat description of what happens. A grief or heartbreak story earns quiet, precise devastation — not melodrama, not a joke.
   - Open mid-tension, mid-image, or mid-question. Never start with "In a world where...", "This is a story about...", "Follow [name] as...", or any other scene-setting throat-clearing.
   - Favor concrete nouns and verbs over abstract feeling-words. "She burned the letters before he could read the last one" beats "A tale of heartbreak and secrets."
   - No quotation marks around your answer. No em-dash cliché ("not just X — it's Y"). No generic superlatives like "unforgettable," "gripping," or "powerful" — those are what a hook fails to be, not what it says.

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
