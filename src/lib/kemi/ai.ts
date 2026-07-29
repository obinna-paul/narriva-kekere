import { KEMI_SYSTEM_PROMPT } from "@/content/kemi-prompt";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface KemiAIResult {
  reply: string;
  recommendedSlugs: string[];
}

// Matches a trailing "RECOMMEND: slug-1, slug-2" line the prompt instructs
// the model to append — stripped from what the reader sees, parsed into
// recommendedSlugs for the route to validate against the real catalog. The
// captured group is 0+, not 1+: the model occasionally emits a bare
// "RECOMMEND:" with nothing after it (decided mid-generation not to
// recommend after all), and that trailing line must still be stripped from
// the visible reply — a 1+ requirement left it leaking as literal text.
const RECOMMEND_LINE = /\n?RECOMMEND:\s*(.*?)\s*$/i;

/**
 * Calls Groq API with openai/gpt-oss-120b (free tier, no credit card) using
 * Kemi's own system prompt, catalog, and reader context. Returns null on
 * any failure (missing key, network error, non-2xx, empty content) so the
 * caller can fall back to a fun "Kemi's away" message instead of a raw
 * error — Kemi never surfaces a technical failure to a reader.
 */
export async function askKemiAI(
  question: string,
  history: { role: "user" | "assistant"; content: string }[],
  catalogText: string,
  readerContextText: string,
  writersText: string,
  competitionsText: string,
): Promise<KemiAIResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const system = KEMI_SYSTEM_PROMPT.replace("{READER_CONTEXT}", readerContextText)
    .replace("{CATALOG}", catalogText)
    .replace("{WRITERS}", writersText)
    .replace("{COMPETITIONS}", competitionsText);

  const messages: GroqMessage[] = [{ role: "system", content: system }];
  for (const msg of history.slice(-10)) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: "user", content: question });

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        reasoning_effort: "low",
        messages,
        temperature: 0.8,
        // gpt-oss-120b spends part of this budget on its own reasoning
        // before the visible reply — too tight a cap makes it plausible for
        // reasoning alone to exhaust max_tokens and leave `content` empty,
        // which reads to a reader as Kemi randomly going "away" mid-chat.
        max_tokens: 900,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      console.error("Kemi Groq call failed:", res.status, await res.text().catch(() => "<no body>"));
      return null;
    }

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content as string | undefined;
    if (!raw) {
      console.error("Kemi Groq call returned no content:", JSON.stringify(json));
      return null;
    }

    const match = raw.match(RECOMMEND_LINE);
    if (!match) return { reply: raw.trim(), recommendedSlugs: [] };

    const recommendedSlugs = match[1]
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean);
    const reply = raw.slice(0, match.index).trim();

    return { reply, recommendedSlugs };
  } catch (err) {
    console.error("Kemi Groq call failed:", (err as Error).message);
    return null;
  }
}
