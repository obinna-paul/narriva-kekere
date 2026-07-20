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

Available tags, grouped by dimension — this shows what each tag actually covers; the removal test below decides which ones apply. This platform allows at most 2 tags per story — never suggest more than 2.

${tagCatalog}

---

Your task:

1. THE ONE RULE FOR THE PRIMARY TAG — THE REMOVAL TEST: ask yourself, if I stripped this element out entirely, does the story still have a shape? If yes, it's flavor, not structure — don't tag it as primary. If no — the story collapses without it — that's your primary tag. A story can be funny throughout without "funny" being primary, if the humor is voice rather than engine. The test isn't "is this present," it's "is this load-bearing."

   Reading procedure: before matching to the tag list, answer in a phrase — "what is this story mechanically about, what makes it move forward?" — then match that to the closest tag. Run the removal test on it to confirm.

2. A SECOND tag gets added for one of two different reasons — do not conflate them:
   - REASON 1, a true structural hybrid: two engines are BOTH load-bearing — remove either one and the story collapses or becomes a fundamentally different, lesser story. Example: two rival chefs sabotaging each other's dishes while falling for each other, told through constant comic set-pieces — strip the romance and it's a workplace comedy with no through-line; strip the comedy and it's a generic romance. Both independently pass the removal test → tag both "romance" and "funny."
   - REASON 2, a dominant tone riding alongside a single structural primary: only ONE load-bearing engine, but a tone tag needs to surface anyway because it materially changes what a reader should expect. Example: a woman returns to her childhood home after her mother's death; small objects keep moving; the ending stays ambiguous, no genre horror payoff. Remove the unsettling atmosphere and it's still fundamentally a story about grief — "grief" is load-bearing, the eeriness is texture. Primary: "grief". Secondary: "creepy" — a tone modifier, not a second engine.
   Ask which situation you're actually in — conflating these two is what makes tagging feel inconsistent. Do not add a second tag from the SAME dimension as a hedge (don't pick both "dark" and "creepy," or both "funny" and "satire" — pick whichever is actually dominant). The bar for a second tag is high; most stories deserve exactly one.

3. THE CONTENT-FLAG EXCEPTION: "erotic" doesn't answer "what kind of story is this" — it answers "what does a reader need to know before they open this, regardless of genre." Its job is disclosure, not classification. If the story depicts explicit adult content, "erotic" applies REGARDLESS of whether you've already used your slots on genre or theme — tag what's depicted, never what the writing "earns" through plot-relevance. Because tags are capped at 2, the content flag always outranks a Reason-2 tone modifier for the second slot; it never competes with the primary tag either (e.g. primary "romance" + explicit content → "romance, erotic").

4. COMMON MISTAKES: do not default to "dark" just because the story depicts something serious — "dark" means the story's own tone is genuinely bleak with no comedic distance; a heavy subject handled through irony or exaggeration is "satire," "funny," or "absurdist," not "dark," no matter how serious the topic. Other frequently confused pairs: dark vs. creepy vs. psychological (bleak/morally-heavy vs. eerie/horror-adjacent vs. mind-games/unreliable-narration — pick the actual driver, not all three); tragic vs. dark (tragic is about how the story ends, not its overall tone — a warm, funny story can still land tragic); grief vs. heartbreak vs. melancholy (death/mourning vs. specifically romantic loss vs. a general bittersweet tone unrelated to either).

5. If you strongly believe the story calls for a tag that does not exist in the list, you may suggest ONE new tag (provide: slug in kebab-case, label, a catchy one-sentence feedHeading for the feed row, and a short description). Only do this if the story really needs it — most stories are covered by the existing list.

6. SEPARATELY, decide "isAdult": a blunt safety check, independent of the tags above — should this story sit behind an 18+ age gate? true if the story contains explicit sexual content, graphic violence or gore, or genuinely disturbing/traumatic material (torture, self-harm, extreme abuse) described in detail rather than implied. false for everything else, including stories that are dark, sad, scary, or carry a tag like "erotic" for mild/implied romantic content — the bar is graphic, on-the-page depiction, not subject matter alone. When genuinely unsure, prefer false; this is a first pass for a human admin to confirm, not a final call.

Respond ONLY with valid JSON in this exact shape:
{
  "existingTagSlugs": ["slug-a", "slug-b"],
  "newTag": null,
  "isAdult": false
}

Or if a new tag is warranted:
{
  "existingTagSlugs": ["slug-a"],
  "newTag": {
    "slug": "new-slug",
    "label": "New Label",
    "feedHeading": "Catchy heading for the feed row",
    "description": "Short one-line description"
  },
  "isAdult": false
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
        max_tokens: 280,
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
      isAdult?: boolean;
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON", raw }, { status: 500 });
    }

    // Validate slugs exist in our tag list, capped at 2 per the platform's 1–2 tag
    // policy. "erotic" is a content-disclosure flag, not a creative
    // classification — sort it to the front so it's never the one silently
    // dropped by the cap if the model lists 3+ despite the prompt's instructions.
    const validSlugs = (parsed.existingTagSlugs ?? [])
      .filter((s) => TAG_BY_SLUG[s])
      .sort((a, b) => (a === "erotic" ? -1 : b === "erotic" ? 1 : 0))
      .slice(0, 2);

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
      isAdult: typeof parsed.isAdult === "boolean" ? parsed.isAdult : null,
    });
  },
  { roles: ["ADMIN"] },
);
