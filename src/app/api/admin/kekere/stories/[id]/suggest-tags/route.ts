export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { STORY_TAGS, TAG_BY_SLUG } from "@/content/story-tags";

function bodyToPlainText(body: unknown): string {
  if (!body || typeof body === "string") return (body as string) ?? "";
  try {
    const doc = body as { content?: Array<{ content?: Array<{ text?: string }> }> };
    return (doc.content ?? [])
      .flatMap((node) => (node.content ?? []).map((c) => c.text ?? ""))
      .join(" ");
  } catch {
    return "";
  }
}

export const POST = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });

    const story = await prisma.story.findUnique({
      where: { id },
      select: { title: true, genre: true, hookLine: true, body: true },
    });

    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    const bodyText = bodyToPlainText(story.body);
    const excerpt = bodyText.slice(0, 2500);

    const tagList = STORY_TAGS.map(
      (t) => `- ${t.slug}: "${t.label}" — ${t.description}`
    ).join("\n");

    const prompt = `You are a literary editor tagging short stories for an African fiction platform called Kekere Stories.

Here is the story to tag:

Title: ${story.title}
Genre: ${story.genre}
Hook line: ${story.hookLine ?? "(none)"}

Story excerpt (up to 2500 chars):
${excerpt}

---

Available tags (slug: label — description):
${tagList}

---

Your task:
1. Choose 1 or 2 tags from the list above that best describe this story. Default to ONE tag: the single most specific, most useful tag a reader would rely on when deciding whether to read this story. Only add a SECOND tag when the story genuinely, substantively spans two distinct themes — for example, a story that is both a love story AND fundamentally about grief deserves both "romance" and "grief". Do not add a second tag just because it is loosely related, a close synonym, or shares the same mood as the first (e.g. don't pick both "dark" and "creepy" — pick whichever fits best). The bar for a second tag is high; most stories deserve exactly one.
2. If you strongly believe the story calls for a tag that does not exist in the list, you may suggest ONE new tag (provide: slug in kebab-case, label, a catchy one-sentence feedHeading for the feed row, and a short description). Only do this if the story really needs it — most stories are covered by the existing list.

Respond ONLY with valid JSON in this exact shape:
{
  "existingTagSlugs": ["slug-a", "slug-b"],
  "newTag": null
}

Or if a new tag is warranted:
{
  "existingTagSlugs": ["slug-a"],
  "newTag": {
    "slug": "new-slug",
    "label": "New Label",
    "feedHeading": "Catchy heading for the feed row",
    "description": "Short one-line description"
  }
}

No markdown fences. No commentary. JSON only.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[suggest-tags] Groq error:", err);
      return NextResponse.json({ error: "AI request failed" }, { status: 502 });
    }

    const groqData = await res.json();
    const raw: string = groqData.choices?.[0]?.message?.content ?? "{}";

    // Strip markdown fences if the model wraps the JSON anyway
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

    let parsed: {
      existingTagSlugs?: string[];
      newTag?: { slug: string; label: string; feedHeading: string; description: string } | null;
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON", raw }, { status: 500 });
    }

    // Validate slugs exist in our tag list, capped at 2 per the platform's 1–2 tag policy
    const validSlugs = (parsed.existingTagSlugs ?? []).filter((s) => TAG_BY_SLUG[s]).slice(0, 2);

    // Look up DB tag IDs for valid slugs
    const dbTags = await prisma.tag.findMany({
      where: { slug: { in: validSlugs } },
      select: { id: true, slug: true },
    });

    const suggestions = dbTags.map((t) => ({
      id: t.id,
      slug: t.slug,
      label: TAG_BY_SLUG[t.slug]?.label ?? t.slug,
      feedHeading: TAG_BY_SLUG[t.slug]?.feedHeading ?? "",
    }));

    return NextResponse.json({
      suggestions,
      newTag: parsed.newTag ?? null,
    });
  },
  { roles: ["ADMIN"] },
);
