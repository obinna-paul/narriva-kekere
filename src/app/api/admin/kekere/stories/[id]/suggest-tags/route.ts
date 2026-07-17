export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { TAG_BY_SLUG, buildTagCatalogForAI } from "@/content/story-tags";

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

    const tagCatalog = buildTagCatalogForAI();

    const prompt = `You are a literary editor tagging short stories for an African fiction platform called Kekere Stories. Tags determine exactly where a story is placed on the feed, so precision matters more than coverage — a reader browsing a tag's row has a specific expectation of what they're about to read, and the wrong tag actively misleads them.

Here is the story to tag:

Title: ${story.title}
Genre: ${story.genre}
Hook line: ${story.hookLine ?? "(none)"}

Story excerpt (up to 2500 chars):
${excerpt}

---

Available tags, grouped by dimension — TONE, THEME, SETTING, GENRE, CHARACTER TYPE, and READER EXPERIENCE. That grouping matters: identify which dimension is actually doing the defining work for this story before you pick within it.

${tagCatalog}

---

Your task:
1. STEP 1 — Ask what the story's DOMINANT MODE is: how does it actually feel to read, start to finish? Is its identity really its TONE (funny, dark, creepy, heartwarming, tense, melancholy, rage, poetic, absurdist), or is it really its GENRE/FORM (thriller, mystery, psychological, speculative, literary, crime, coming-of-age, satire)? Pick ONE tag from whichever dimension is most defining — this is almost always your primary tag.

   THE MOST COMMON MISTAKE: TONE is not a checklist of "serious subjects the story touches on." A story can depict corruption, violence, or grief and still not be "dark" — "dark" specifically means the story's own tone is genuinely bleak or unsettling, with no comedic distance. If the story handles a heavy subject through irony, exaggeration, or a pointed comedic lens, its tone is satire, funny, or absurdist — NOT dark — no matter how serious the underlying topic is. Do not default to "dark" just because something bad happens in the story.

   Other commonly confused pairs: dark vs. creepy vs. psychological (bleak/morally-heavy vs. eerie/horror-adjacent vs. mind-games/unreliable-narration — pick the actual driver, not all three); tragic vs. dark (tragic is about how the story ends, not its overall tone — a warm, funny story can still land tragic); grief vs. heartbreak vs. melancholy (death/mourning vs. specifically romantic loss vs. a general bittersweet tone unrelated to either).

2. STEP 2 — Only add a SECOND tag if a genuinely different, equally-dominant dimension applies — most often a THEME the story is fundamentally about, not merely mentions in passing (e.g. a love story that's also fundamentally about grief deserves both "romance" and "grief"). Do not add a second tag from the SAME dimension as a hedge (don't pick both "dark" and "creepy," or both "funny" and "satire" — pick whichever is actually dominant). The bar for a second tag is high; most stories deserve exactly one.
3. If you strongly believe the story calls for a tag that does not exist in the list, you may suggest ONE new tag (provide: slug in kebab-case, label, a catchy one-sentence feedHeading for the feed row, and a short description). Only do this if the story really needs it — most stories are covered by the existing list.

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
