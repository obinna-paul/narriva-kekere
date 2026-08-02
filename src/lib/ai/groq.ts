/**
 * The one place a chat-completion call is made. Every AI feature — Kemi (reader
 * chat), Nari (sales chat), hookline/tag/summary generation — used to hand-roll
 * its own fetch with no retry, so a single transient failure dropped the whole
 * reply.
 *
 * On a free tier the dominant failure is a rate-limit 429, rejected *instantly*
 * — precisely the "Kemi fails every other message" symptom. Two defences layer
 * here:
 *   1. Retry: transient failures (429, 5xx, network, timeout) are retried,
 *      honouring the provider's own `Retry-After`, so a momentary limit no
 *      longer surfaces as a dead message.
 *   2. Provider fallback: Groq's free tier is generous on requests-per-day but
 *      brutally small on tokens-per-minute (~6k TPM), which a single big Kemi
 *      prompt nearly exhausts on its own. Google's Gemini free tier is the
 *      mirror image — ~250k TPM but far fewer requests/day. They're
 *      complementary, so a caller can name an ordered provider list and we try
 *      each in turn until one returns text. Token-heavy conversational callers
 *      (Kemi, Nari) put Gemini first to escape the TPM wall; everything else
 *      defaults to Groq-first with Gemini as a safety net.
 *
 * Gemini is only ever attempted when GEMINI_API_KEY is set. With no such key
 * the behaviour is identical to Groq-only — so this file can ship before the
 * key exists, and adding the key later activates the fallback with no redeploy
 * of logic.
 *
 * Privacy: logs status + the provider's error type/code only, never the
 * response body. Some upstream validation errors echo the offending request
 * back, and that body is the user's actual conversation/draft — it has no
 * business in a log.
 */

export type ChatProvider = "groq" | "gemini";

interface ProviderConfig {
  url: string;
  apiKey: string | undefined;
  /** Model used when the caller doesn't override it (only Groq honours an
   *  override — a caller's `model` is a Groq model id, meaningless to Gemini). */
  defaultModel: string;
  allowModelOverride: boolean;
  /** gpt-oss reasoning models take a `reasoning_effort`; Gemini rejects it. */
  includeReasoningEffort: boolean;
}

function providerConfig(provider: ChatProvider): ProviderConfig {
  switch (provider) {
    case "groq":
      return {
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: process.env.GROQ_API_KEY,
        defaultModel: "openai/gpt-oss-120b",
        allowModelOverride: true,
        includeReasoningEffort: true,
      };
    case "gemini":
      // Gemini's OpenAI-compatible endpoint speaks the same request/response
      // shape as Groq, so the retry loop below is provider-agnostic. 2.0 Flash
      // (not 2.5) for its far higher free-tier requests-per-day ceiling.
      return {
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        apiKey: process.env.GEMINI_API_KEY,
        defaultModel: "gemini-2.0-flash",
        allowModelOverride: false,
        includeReasoningEffort: false,
      };
  }
}

export interface GroqChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatParams {
  messages: GroqChatMessage[];
  maxTokens: number;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
  /** Overrides the Groq model only. Ignored by Gemini (see ProviderConfig). */
  model?: string;
  /** Per-attempt timeout. Kept modest so 2–3 attempts still fit inside a
   *  serverless function's wall-clock budget. */
  timeoutMs?: number;
  /** Set "json_object" to constrain the reply to valid JSON. */
  responseFormat?: "json_object";
  /** Short tag identifying the caller in logs, e.g. "kemi", "nari:hookline". */
  label: string;
  /** Ordered providers to try until one returns text. Defaults to
   *  ["groq", "gemini"]. Token-heavy conversational callers pass
   *  ["gemini", "groq"] to lead with Gemini's large tokens-per-minute budget. */
  providers?: ChatProvider[];
}

const MAX_ATTEMPTS = 3;
// A rate-limit's Retry-After can be long; honour it, but never wait so long we
// blow the function timeout. Past this cap, giving up on this provider (and
// falling through to the next, or to the caller's friendly fallback) beats
// hanging.
const MAX_RETRY_WAIT_MS = 5000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retryDelayMs(res: Response | null, attempt: number): number {
  // Providers send Retry-After in seconds on a 429; trust it when present.
  const header = res?.headers.get("retry-after");
  if (header) {
    const secs = Number(header);
    if (Number.isFinite(secs) && secs > 0) return Math.min(secs * 1000, MAX_RETRY_WAIT_MS);
  }
  // Otherwise exponential backoff with jitter: ~0.6s, ~1.4s.
  const base = 600 * Math.pow(2, attempt - 1);
  return Math.min(base + Math.random() * 300, MAX_RETRY_WAIT_MS);
}

/**
 * Returns the assistant message's text, or null on an unrecoverable failure
 * (no configured provider, a permanent 4xx, an empty completion, or retries
 * exhausted) so every caller can fall back to its own friendly message rather
 * than surface a raw error. Retries only the transient failures — 429, 5xx,
 * network/timeout — then, if that provider still fails, moves on to the next
 * provider in the list.
 */
export async function callGroqChat(params: GroqChatParams): Promise<string | null> {
  const order = params.providers ?? ["groq", "gemini"];
  const available = order.filter((p) => providerConfig(p).apiKey);

  if (available.length === 0) {
    console.error(`[${params.label}] no chat provider configured (checked ${order.join(", ")})`);
    return null;
  }

  for (const provider of available) {
    const text = await callProvider(provider, params);
    if (text) return text;
    // This provider failed after its own retries; fall through to the next.
    if (available.length > 1) {
      console.warn(`[${params.label}/${provider}] failed — trying next provider`);
    }
  }

  return null;
}

async function callProvider(provider: ChatProvider, params: GroqChatParams): Promise<string | null> {
  const config = providerConfig(provider);
  const tag = `${params.label}/${provider}`;

  const body = JSON.stringify({
    model: config.allowModelOverride ? params.model ?? config.defaultModel : config.defaultModel,
    ...(config.includeReasoningEffort ? { reasoning_effort: params.reasoningEffort ?? "low" } : {}),
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens,
    ...(params.responseFormat ? { response_format: { type: params.responseFormat } } : {}),
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response | null = null;
    try {
      res = await fetch(config.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body,
        signal: AbortSignal.timeout(params.timeoutMs ?? 15000),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content as string | undefined;
        if (content) return content;
        // Empty completion (e.g. reasoning ate the whole max_tokens budget) —
        // a retry won't produce more tokens, so stop this provider here.
        console.error(`[${tag}] empty completion`, json.choices?.[0]?.finish_reason);
        return null;
      }

      // Permanent client errors (bad request, auth, payload too large) won't
      // improve on retry.
      if (res.status !== 429 && res.status < 500) {
        const errJson = await res.json().catch(() => null);
        console.error(`[${tag}] non-retryable`, res.status, errJson?.error?.type, errJson?.error?.code);
        return null;
      }

      // 429 / 5xx — retryable. Fall through to backoff unless out of attempts.
      console.warn(`[${tag}] retryable ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS})`);
    } catch (err) {
      // Network error or per-attempt timeout — also retryable.
      console.warn(`[${tag}] ${(err as Error).name} (attempt ${attempt}/${MAX_ATTEMPTS})`);
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(retryDelayMs(res, attempt));
    }
  }

  console.error(`[${tag}] gave up after ${MAX_ATTEMPTS} attempts`);
  return null;
}
