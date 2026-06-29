import { prisma } from "@/lib/db/prisma";

interface MessageEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

type IntentLevelShort = "HIGH" | "MEDIUM" | "LOW" | "BROWSING";

interface ExtractionResult {
  visitorName: string | null;
  visitorEmail: string | null;
  manuscriptTopic: string | null;
  manuscriptStatus: string | null;
  wordCount: string | null;
  servicesInterest: string[];
  timelineSignal: string | null;
  budgetSignal: string | null;
  painPoints: string | null;
  competitorMentions: string[];
  intentLevel: IntentLevelShort;
}

const FALLBACK_RESULT: ExtractionResult = {
  visitorName: null,
  visitorEmail: null,
  manuscriptTopic: null,
  manuscriptStatus: null,
  wordCount: null,
  servicesInterest: [],
  timelineSignal: null,
  budgetSignal: null,
  painPoints: null,
  competitorMentions: [],
  intentLevel: "BROWSING",
};

function buildTranscript(messages: MessageEntry[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "Visitor" : "Nari"}: ${m.content}`)
    .join("\n\n");
}

export async function extractConversationIntelligence(conversationId: string) {
  const existingIntel = await prisma.nariConversationIntel.findUnique({
    where: { conversationId },
  });

  if (existingIntel) return;

  const conversation = await prisma.nariConversation.findUnique({
    where: { id: conversationId },
    select: { messages: true },
  });

  if (!conversation) return;

  const messages = conversation.messages as unknown as MessageEntry[];
  if (messages.length < 2) return;

  const transcript = buildTranscript(messages);

  try {
    const intel = await callGroqExtraction(transcript);

    await prisma.nariConversationIntel.create({
      data: {
        conversationId,
        visitorName: intel.visitorName,
        visitorEmail: intel.visitorEmail,
        manuscriptTopic: intel.manuscriptTopic,
        manuscriptStatus: intel.manuscriptStatus,
        wordCount: intel.wordCount,
        servicesInterest: intel.servicesInterest,
        timelineSignal: intel.timelineSignal,
        budgetSignal: intel.budgetSignal,
        painPoints: intel.painPoints,
        competitorMentions: intel.competitorMentions,
        intentLevel: intel.intentLevel,
      },
    });
  } catch (err) {
    console.error("[nari] extraction error:", (err as Error).message);

    await prisma.nariConversationIntel.create({
      data: {
        conversationId,
        ...FALLBACK_RESULT,
      },
    });
  }
}

const EXTRACTION_SYSTEM_PROMPT =
  "You are an intelligence extraction system for a publishing company called Narriva. Extract structured information from a customer service conversation. Respond only with a valid JSON object, no other text.";

const EXTRACTION_USER_PREFIX = `Extract business intelligence from this conversation transcript. Return a JSON object with these exact fields (use null for any field not mentioned):
{
  "visitorName": string | null,
  "visitorEmail": string | null,
  "manuscriptTopic": string | null,
  "manuscriptStatus": string | null,
  "wordCount": string | null,
  "servicesInterest": string[],
  "timelineSignal": string | null,
  "budgetSignal": string | null,
  "painPoints": string | null,
  "competitorMentions": string[],
  "intentLevel": "HIGH" | "MEDIUM" | "LOW" | "BROWSING"
}
intentLevel should be HIGH if the person is clearly ready to submit or has a finished manuscript, MEDIUM if exploring, LOW if gathering general info, BROWSING if just asking general questions.
Conversation:`;

const VALID_INTENTS: IntentLevelShort[] = ["HIGH", "MEDIUM", "LOW", "BROWSING"];

function sanitize(raw: Record<string, unknown>): ExtractionResult {
  const intent = raw.intentLevel;
  const sanitizedIntent: IntentLevelShort =
    typeof intent === "string" && VALID_INTENTS.includes(intent as IntentLevelShort)
      ? (intent as IntentLevelShort)
      : "BROWSING";

  return {
    visitorName: stringOrNull(raw.visitorName),
    visitorEmail: stringOrNull(raw.visitorEmail),
    manuscriptTopic: stringOrNull(raw.manuscriptTopic),
    manuscriptStatus: stringOrNull(raw.manuscriptStatus),
    wordCount: stringOrNull(raw.wordCount),
    servicesInterest: Array.isArray(raw.servicesInterest)
      ? (raw.servicesInterest as string[]).filter((v): v is string => typeof v === "string")
      : [],
    timelineSignal: stringOrNull(raw.timelineSignal),
    budgetSignal: stringOrNull(raw.budgetSignal),
    painPoints: stringOrNull(raw.painPoints),
    competitorMentions: Array.isArray(raw.competitorMentions)
      ? (raw.competitorMentions as string[]).filter((v): v is string => typeof v === "string")
      : [],
    intentLevel: sanitizedIntent,
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function callGroqExtraction(transcript: string): Promise<ExtractionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[nari] GROQ_API_KEY not configured — falling back to BROWSING");
    return FALLBACK_RESULT;
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: EXTRACTION_USER_PREFIX + " " + transcript },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Groq API returned ${res.status}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content as string | undefined;

  if (!text) throw new Error("Empty Groq response");

  const parsed = JSON.parse(text) as Record<string, unknown>;

  return sanitize(parsed);
}
