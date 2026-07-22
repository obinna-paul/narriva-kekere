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
 * than a raw error. Tries the full draft first; if that fails (e.g. Groq
 * rate limits on very large drafts), falls back to the first ~2,500 chars.
 */
export async function suggestHookline(title: string, draftPlainText: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[kemi-hookline] GROQ_API_KEY env var is not set");
    return null;
  }

  // Kekere stories range from ~800 to 15,000 words (roughly 4,000–90,000
  // chars of plain text). llama-3.3-70b-versatile has a 128K-token context
  // window — even the longest Kekere draft fits comfortably. Send the full
  // text so Kemi sees every detail, every paragraph, every word.
  const fullText = draftPlainText;

  // Try full text first, then a shorter fallback if the model's provider
  // rejects the large payload (rate limits, token-per-minute caps, etc.).
  for (const attempt of [fullText, fullText.slice(0, 8000)]) {
    const result = await tryGroqCall(apiKey, title, attempt, attempt === fullText ? "full" : "truncated");
    if (result !== null) return result;
  }

  return null;
}

async function tryGroqCall(
  apiKey: string,
  title: string,
  draftText: string,
  label: string,
): Promise<string | null> {
  console.log("[kemi-hookline] sending to Groq:", {
    label,
    titleLen: title.length,
    draftLen: draftText.length,
    draftWords: draftText.trim() ? draftText.trim().split(/\s+/).length : 0,
  });

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
          { role: "user", content: `Title: ${title}\n\nDraft:\n${draftText}` },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      let errorBody = "";
      try {
        errorBody = await res.text();
      } catch {
        // body unreadable
      }
      console.error("[kemi-hookline] Groq API error:", {
        label,
        status: res.status,
        statusText: res.statusText,
        body: errorBody.slice(0, 500),
      });
      return null;
    }

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content as string | undefined;
    if (!raw) {
      console.error("[kemi-hookline] Groq returned no content:", JSON.stringify(json).slice(0, 300));
      return null;
    }

    const cleaned = raw.trim().replace(/^["']|["']$/g, "");
    if (!cleaned || cleaned.length > 200) {
      console.error("[kemi-hookline] invalid hookline:", {
        raw: raw.slice(0, 200),
        cleanedLen: cleaned.length,
      });
      return null;
    }

    return cleaned;
  } catch (err) {
    console.error("[kemi-hookline] fetch failed:", (err as Error).message, {
      label,
      name: (err as Error).name,
      draftLen: draftText.length,
    });
    return null;
  }
}
