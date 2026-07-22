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

    // Build a smart excerpt: opening (first ~10k chars = ~1600 words) for the
    // setup + characters + tone, and if the story is longer than that, the
    // ending (~3k chars = ~500 words) for the tension point/resolution context.
    // The full text was overwhelming the model and it couldn't follow its
    // instructions reliably. This excerpt gives Kemi enough to find concrete
    // specifics for both tags and hooklines.
    const OPENING_LEN = 10000;
    const ENDING_LEN = 3000;
    let excerpt: string;
    if (bodyText.length <= OPENING_LEN + ENDING_LEN) {
      excerpt = bodyText;
    } else {
      const opening = bodyText.slice(0, OPENING_LEN);
      const ending = bodyText.slice(-ENDING_LEN);
      excerpt = `${opening}\n\n[... story continues ...]\n\n${ending}`;
    }

    const tagCatalog = buildTagCatalogForAI();

    const prompt = `You are a literary editor tagging short stories for an African fiction platform called Kekere Stories. Tags determine exactly where a story is placed on the feed, so precision matters more than coverage — a reader browsing a tag's row has a specific expectation of what they're about to read, and the wrong tag actively misleads them.

Here is the story:

Title: ${story.title}
Genre: ${story.genre}
Current hook line: ${story.hookLine ?? "(none)"}

Story excerpt:
${excerpt}

---

Available tags, grouped by dimension — this shows what each tag actually covers; the removal test below decides which ones apply. This platform allows at most 2 tags per story — never suggest more than 2.

${tagCatalog}

---

Your task — do these in order:

## PART A: TAG SUGGESTION

1. THE ONE RULE FOR THE PRIMARY TAG — THE REMOVAL TEST: ask yourself, if I stripped this element out entirely, does the story still have a shape? If yes, it's flavor, not structure — don't tag it as primary. If no — the story collapses without it — that's your primary tag. A story can be funny throughout without "funny" being primary, if the humor is voice rather than engine. The test isn't "is this present," it's "is this load-bearing."

   Reading procedure: before matching to the tag list, answer in a phrase — "what is this story mechanically about, what makes it move forward?" — then match that to the closest tag. Run the removal test on it to confirm.

2. A SECOND tag gets added for one of two different reasons — do not conflate them:
   - REASON 1, a true structural hybrid: two engines are BOTH load-bearing — remove either one and the story collapses or becomes a fundamentally different, lesser story.
   - REASON 2, a dominant tone riding alongside a single structural primary: only ONE load-bearing engine, but a tone tag needs to surface anyway because it materially changes what a reader should expect.
   Do not add a second tag from the SAME dimension as a hedge (don't pick both "dark" and "creepy," or both "funny" and "satire" — pick whichever is actually dominant). The bar for a second tag is high; most stories deserve exactly one.

3. THE CONTENT-FLAG EXCEPTION: "erotic" doesn't answer "what kind of story is this" — it answers "what does a reader need to know before they open this, regardless of genre." Its job is disclosure, not classification. Because tags are capped at 2, the content flag always outranks a Reason-2 tone modifier for the second slot; it never competes with the primary tag either.

4. COMMON MISTAKES: do not default to "dark" just because the story depicts something serious — "dark" means the story's own tone is genuinely bleak with no comedic distance; a heavy subject handled through irony or exaggeration is "satire," "funny," or "absurdist," not "dark," no matter how serious the topic. Other frequently confused pairs: dark vs. creepy vs. psychological (bleak/morally-heavy vs. eerie/horror-adjacent vs. mind-games/unreliable-narration — pick the actual driver, not all three); tragic vs. dark (tragic is about how the story ends, not its overall tone — a warm, funny story can still land tragic); grief vs. heartbreak vs. melancholy (death/mourning vs. specifically romantic loss vs. a general bittersweet tone unrelated to either).

5. If you strongly believe the story calls for a tag that does not exist in the list, you may suggest ONE new tag (provide: slug in kebab-case, label, a catchy one-sentence feedHeading for the feed row, and a short description). Only do this if the story really needs it — most stories are covered by the existing list.

## PART B: HOOKLINE SUGGESTION

6. Now suggest a hook line for this story. A hook line is NOT a summary — it is a promise of tension. It tells a reader: here is a question that will hurt to leave unanswered. It raises a question, never answers one. If a line explains the plot, it's doing the wrong job. If it makes someone feel a small itch of "wait, what?" — it is working.

   HOW TO WRITE IT:
   - FIRST, find the THREE most specific, concrete details in the story — a character name, a striking object, a line of dialogue, a vivid image, a particular moment. Not themes. Not "love" or "grief" or "betrayal" — actual things that happen in THIS story. Quote them to yourself.
   - SECOND, find the central tension or unanswered question. What is the reader wondering about at the end?
   - THEN, write ONE hook line that plants that question, built from one or two of those concrete details. The hook should anchor itself to something specific from THIS story — if you could swap it onto a different story by changing a few words, throw it away and try again.

   RULES:
   - You MUST reference at least one concrete detail from the story — a character name, a specific object, a particular image. Generic hooks fail the test.
   - Never summarise the plot. A hookline is a promise of tension, not a synopsis.
   - Never resolve or hint at a resolution — the tension stays open.
   - Match the story's exact tone — never impose a tone that isn't there.
   - No quotation marks, no em-dashes, no "not just X — it's Y", no generic superlatives ("unforgettable," "gripping," "powerful"), no synopsis openers ("In a world where…", "Follow [name] as…", "This is the story of…").
   - Max 150 characters.
   - Write in English.

   If the story already has a good hook line (the current one above), and it satisfies these rules, you may repeat it as your suggestion. If it's weak or generic, suggest a better one. If the current hook line is empty, you MUST suggest one.

## PART C: CONTENT FLAG

7. SEPARATELY, decide "isAdult": a blunt safety check, independent of the tags above — should this story sit behind an 18+ age gate? true if the story contains explicit sexual content, graphic violence or gore, or genuinely disturbing/traumatic material (torture, self-harm, extreme abuse) described in detail rather than implied. false for everything else, including stories that are dark, sad, scary, or carry a tag like "erotic" for mild/implied romantic content — the bar is graphic, on-the-page depiction, not subject matter alone. When genuinely unsure, prefer false; this is a first pass for a human admin to confirm, not a final call.

Respond ONLY with valid JSON in this exact shape:
{
  "existingTagSlugs": ["slug-a", "slug-b"],
  "newTag": null,
  "hookLine": "Your suggested hook line here",
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
  "hookLine": "Your suggested hook line here",
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
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(25000),
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
      hookLine?: string;
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

    const hookLine = typeof parsed.hookLine === "string" && parsed.hookLine.trim()
      ? parsed.hookLine.trim().slice(0, 200)
      : null;

    return NextResponse.json({
      suggestions,
      newTag: parsed.newTag ?? null,
      hookLine,
      isAdult: typeof parsed.isAdult === "boolean" ? parsed.isAdult : null,
    });
  },
  { roles: ["ADMIN"] },
);
