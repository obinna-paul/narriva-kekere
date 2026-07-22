// Kemi's writer-assist mode: suggests a single hook line for a writer's own
// unfinished draft, so a "coming soon" pick with no hook line yet isn't
// stuck without one. Separate from src/lib/kemi/ai.ts (the reader-facing
// companion) — this is a one-shot generation call, not a conversation.
//
// The key insight: past versions tried to teach Kemi a "formula" (setup +
// fracture, five techniques, etc.) — but the model fixated on the formula
// instead of the text. This version forces her to find the most arresting
// specific details in the draft FIRST, then build the hookline from those
// details. No more generic hooks that could apply to any story.

const SYSTEM_PROMPT = `You are Kemi, Kekere Stories' sharp-eyed reading companion. A writer has sent you their unfinished draft — read EVERY word of it. Your job: write ONE hook line (max 150 characters) that makes a reader desperate to know what happens next.

BEFORE you write anything, silently do this inside your head:
1. Find the THREE most specific, concrete details in the draft — a name, an object, a line of dialogue, an image, a particular moment. Not themes. Not "love" or "grief" or "betrayal" — actual things that happen. Quote them to yourself.
2. Find the central tension or unanswered question that the draft sets up but hasn't resolved yet. What is the reader wondering about after finishing what's written?
3. Now write ONE hookline that plants that question in the reader's mind, built from one or two of those specific details.

RULES:
- You MUST reference at least one concrete detail from the draft — a character name, a specific object, a particular line or image. If your hookline could apply to a different story by swapping a few words, throw it away and try again.
- Never summarise the plot. A hookline is a promise of tension, not a synopsis.
- Never resolve or even hint at a resolution that isn't written yet. The tension stays open.
- Match the draft's exact tone — never import a tone that isn't there.
- No quotation marks, no em-dashes, no "not just X — it's Y", no generic superlatives ("unforgettable", "gripping"), no synopsis openers ("In a world where…", "Follow [name] as…", "This is the story of…").
- Max 150 characters.

Reply with ONLY the hook line — no preamble, no explanation, no quotes around it.`;

/**
 * Best-effort — returns null on any failure (missing key, network error,
 * empty/oversized response) so the caller can show a friendly retry rather
 * than a raw error.
 */
export async function suggestHookline(title: string, draftPlainText: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  // Kekere stories range from ~800 to 15,000 words (roughly 4,000–90,000
  // chars of plain text). llama-3.3-70b-versatile has a 128K-token context
  // window — even the longest Kekere draft fits comfortably. Send the full
  // text so Kemi sees every detail, every paragraph, every word.
  const safe = draftPlainText;

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
          { role: "user", content: `Title: ${title}\n\nDraft:\n${safe}` },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content as string | undefined;
    if (!raw) return null;

    const cleaned = raw.trim().replace(/^["']|["']$/g, "");
    if (!cleaned || cleaned.length > 200) return null;

    return cleaned;
  } catch (err) {
    console.error("Kemi hookline suggestion failed:", (err as Error).message);
    return null;
  }
}
