import { NARI_FAQ } from "@/content/nari-faq";
import { NARI_SYSTEM_PROMPT } from "@/content/nari-prompt";

const FAQ_EMBEDDED = NARI_FAQ.map(
  (faq) => `Q: ${faq.question}\nA: ${faq.answer}`,
).join("\n\n");

const SYSTEM = NARI_SYSTEM_PROMPT.replace("{FAQ_EMBEDDED}", FAQ_EMBEDDED);

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface NariResponse {
  answer: string;
}

/**
 * Calls Groq API with Llama 3.3 70B (free tier, no credit card).
 * Falls back to null if the API key is not configured or the call fails.
 */
export async function askNariAI(
  question: string,
  history: { role: "user" | "nari"; text: string }[],
): Promise<NariResponse | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const messages: GroqMessage[] = [{ role: "system", content: SYSTEM }];

  for (const msg of history.slice(-8)) {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.text,
    });
  }

  messages.push({ role: "user", content: question });

  try {
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          temperature: 0.7,
          max_tokens: 600,
        }),
        signal: AbortSignal.timeout(20000),
      },
    );

    if (!res.ok) return null;

    const json = await res.json();
    const answer = json.choices?.[0]?.message?.content as string | undefined;
    if (!answer) return null;

    return { answer };
  } catch (err) {
    console.error("Nari Groq call failed:", (err as Error).message);
    return null;
  }
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