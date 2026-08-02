import { KEMI_SYSTEM_PROMPT } from "@/content/kemi-prompt";
import { callGroqChat, type GroqChatMessage } from "@/lib/ai/groq";

export interface KemiAIResult {
  reply: string;
  /** Whatever the model wrote after its RECOMMEND line — catalog slugs or, for
   *  models that improvise, exact titles. The route resolves each against the
   *  real catalog, so this stays deliberately loose. */
  recommendedTokens: string[];
}

// Matches the trailing "RECOMMEND: ..." directive the prompt asks the model to
// append. Deliberately forgiving, because it's parsing free-form model output:
//   - the colon is optional (some models write "RECOMMEND" then a newline),
//   - the payload is optional (a bare "RECOMMEND" with nothing after it must
//     still be stripped, or it leaks into the reply as literal text — exactly
//     the bug this replaced),
//   - trailing blank lines after it are tolerated.
// It only matches on the final line (the capture can't cross a newline), which
// is where the directive is supposed to live.
const RECOMMEND_LINE = /\n*[ \t]*RECOMMEND\b[:：]?[ \t]*([^\n]*?)[ \t]*\n*$/i;

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
  // Gemini first: Kemi's prompt (catalog + reader context) is large, and Groq's
  // ~6k tokens/min free ceiling is what a single such message keeps blowing —
  // Gemini's far larger TPM budget is the primary path, Groq the overflow.
  const raw = await callGroqChat({
    messages,
    temperature: 0.8,
    maxTokens: 900,
    label: "kemi",
    providers: ["gemini", "groq"],
  });
  if (!raw) return null;

  const match = raw.match(RECOMMEND_LINE);
  if (!match) return { reply: raw.trim(), recommendedTokens: [] };

  const recommendedTokens = match[1]
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  const reply = raw.slice(0, match.index).trim();

  return { reply, recommendedTokens };
}
