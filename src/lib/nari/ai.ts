import { NARI_FAQ } from "@/content/nari-faq";
import { NARI_SYSTEM_PROMPT } from "@/content/nari-prompt";
import { callGroqChat, type GroqChatMessage } from "@/lib/ai/groq";

const FAQ_EMBEDDED = NARI_FAQ.map(
  (faq) => `Q: ${faq.question}\nA: ${faq.answer}`,
).join("\n\n");

const SYSTEM = NARI_SYSTEM_PROMPT.replace("{FAQ_EMBEDDED}", FAQ_EMBEDDED);

interface NariResponse {
  answer: string;
}

/**
 * Calls Groq (via the shared, retrying caller). Falls back to null if the API
 * key is not configured or the call fails unrecoverably.
 */
export async function askNariAI(
  question: string,
  history: { role: "user" | "nari"; text: string }[],
): Promise<NariResponse | null> {
  const messages: GroqChatMessage[] = [{ role: "system", content: SYSTEM }];

  for (const msg of history.slice(-8)) {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.text,
    });
  }

  messages.push({ role: "user", content: question });

  // Gemini first for the same reason as Kemi: Nari's prompt embeds the full FAQ,
  // so each turn is token-heavy and keeps blowing Groq's small tokens/min free
  // ceiling. Gemini's larger TPM budget carries it; Groq is the overflow.
  const answer = await callGroqChat({
    messages,
    temperature: 0.7,
    maxTokens: 750,
    label: "nari",
    providers: ["gemini", "groq"],
  });
  if (!answer) return null;

  return { answer };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchNariFAQKeywords(
  question: string,
): { answer: string; links: { label: string; href: string }[] } | null {
  return matchNariFAQ(question, NARI_FAQ);
}

export interface NariFaqEntry {
  answer: string;
  links?: { label: string; href: string }[];
  keywords: string[];
}

export function matchNariFAQ(
  question: string,
  entries: NariFaqEntry[],
): { answer: string; links: { label: string; href: string }[] } | null {
  const normalized = normalize(question);
  if (!normalized) return null;

  const scored = entries.map((entry) => {
    const score = entry.keywords.reduce(
      (total, keyword) =>
        total + (normalized.includes(keyword.toLowerCase()) ? 1 : 0),
      0,
    );
    return { entry, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < 1) return null;
  if (scored[1] && scored[1].score === best.score) return null;

  return { answer: best.entry.answer, links: best.entry.links ?? [] };
}