import { KEMI_SYSTEM_PROMPT } from "@/content/kemi-prompt";
import { callGroqChat, type GroqChatMessage } from "@/lib/ai/groq";

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
 * Calls Groq (via the shared, retrying caller) with Kemi's own system prompt,
 * catalog, and reader context. Returns null on any unrecoverable failure so
 * the caller can fall back to a fun "Kemi's away" message instead of a raw
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
  const system = KEMI_SYSTEM_PROMPT.replace("{READER_CONTEXT}", readerContextText)
    .replace("{CATALOG}", catalogText)
    .replace("{WRITERS}", writersText)
    .replace("{COMPETITIONS}", competitionsText);

  const messages: GroqChatMessage[] = [{ role: "system", content: system }];
  for (const msg of history.slice(-10)) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: "user", content: question });

  // gpt-oss-120b spends part of max_tokens on its own reasoning before the
  // visible reply — too tight a cap makes it plausible for reasoning alone to
  // exhaust the budget and leave the reply empty, reading as Kemi going "away".
  const raw = await callGroqChat({ messages, temperature: 0.8, maxTokens: 900, label: "kemi" });
  if (!raw) return null;

  const match = raw.match(RECOMMEND_LINE);
  if (!match) return { reply: raw.trim(), recommendedSlugs: [] };

  const recommendedSlugs = match[1]
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
  const reply = raw.slice(0, match.index).trim();

  return { reply, recommendedSlugs };
}
