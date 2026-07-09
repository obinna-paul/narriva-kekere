export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { STORY_TAGS, TAG_BY_SLUG } from "@/content/story-tags";

const schema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(50, "Story too short for meaningful suggestions"),
});

const AVAILABLE_TAGS = STORY_TAGS.map((t) => `"${t.slug}" — ${t.label} (${t.description})`).join("\n");

const SYSTEM_PROMPT = `You are a literary analyst for Kekere Stories, a short-fiction platform. Given a story's title and first portion of text, you recommend:

1. The SINGLE most appropriate tag from the list below. Pick exactly one. The tag should match the story's dominant tone, theme, or genre. Reply with the tag SLUG only — not the label, not the description. Example reply: "thriller"

2. A compelling hook line (1 sentence, max 150 characters) that would make a reader want to click. It should be natural and specific to the story, not generic. Do not use quotation marks around it.

Available tags:
${AVAILABLE_TAGS}

Reply in this exact format (each on its own line):
TAG: <slug>
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

  const { title, body: storyText } = parsed.data;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI suggestions are not configured (GROQ_API_KEY not set)" }, { status: 503 });
  }

  const truncated = storyText.slice(0, 2500);

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
          { role: "user", content: `Title: ${title}\n\nStory text:\n${truncated}` },
        ],
        temperature: 0.5,
        max_tokens: 200,
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

    const tagMatch = raw.match(/TAG:\s*(\S+)/i);
    const hookMatch = raw.match(/HOOK:\s*(.+)/i);

    const suggestedSlug = tagMatch?.[1]?.trim().toLowerCase() ?? null;
    const suggestedHook = hookMatch?.[1]?.trim() ?? null;

    const result: Record<string, unknown> = {};

    if (suggestedSlug && TAG_BY_SLUG[suggestedSlug]) {
      const tag = TAG_BY_SLUG[suggestedSlug];
      result.suggestedTag = { slug: tag.slug, label: tag.label, feedHeading: tag.feedHeading };
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
