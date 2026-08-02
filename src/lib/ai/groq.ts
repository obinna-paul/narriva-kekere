/**
 * The one place a Groq chat call is made. Every AI feature — Kemi (reader
 * chat), Nari (sales chat), hookline/tag/summary generation — used to hand-roll
 * its own fetch with no retry, so a single transient failure dropped the whole
 * reply. On the free tier the dominant failure is a rate-limit 429 (a burst of
 * two messages inside the same tokens-per-minute window), which is *rejected
 * instantly* and clears within a few seconds — precisely the "Kemi fails every
 * other message" symptom. This caller retries those, honouring Groq's own
 * `Retry-After`, so a momentary limit no longer surfaces as a dead message.
 *
 * Privacy: logs status + Groq's error type/code only, never the response body.
 * Some upstream validation errors echo the offending request back, and that
 * body is the user's actual conversation/draft — it has no business in a log.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

export interface GroqChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatParams {
  messages: GroqChatMessage[];
  maxTokens: number;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
  model?: string;
  /** Per-attempt timeout. Kept modest so 2–3 attempts still fit inside a
   *  serverless function's wall-clock budget. */
  timeoutMs?: number;
  /** Set "json_object" to make Groq constrain the reply to valid JSON. */
  responseFormat?: "json_object";
  /** Short tag identifying the caller in logs, e.g. "kemi", "nari:hookline". */
  label: string;
}

const MAX_ATTEMPTS = 3;
// A rate-limit's Retry-After can be long; honour it, but never wait so long we
// blow the function timeout. Past this cap, giving up cleanly (null → the
// caller's friendly fallback) beats hanging.
const MAX_RETRY_WAIT_MS = 5000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retryDelayMs(res: Response | null, attempt: number): number {
  // Groq sends Retry-After in seconds on a 429; trust it when present.
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
 * (no API key, a permanent 4xx, an empty completion, or retries exhausted) so
 * every caller can fall back to its own friendly message rather than surface a
 * raw error. Retries only the transient failures — 429, 5xx, network/timeout.
 */
export async function callGroqChat(params: GroqChatParams): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error(`[groq:${params.label}] GROQ_API_KEY is not set`);
    return null;
  }

  const body = JSON.stringify({
    model: params.model ?? DEFAULT_MODEL,
    reasoning_effort: params.reasoningEffort ?? "low",
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens,
    ...(params.responseFormat ? { response_format: { type: params.responseFormat } } : {}),
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response | null = null;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body,
        signal: AbortSignal.timeout(params.timeoutMs ?? 15000),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content as string | undefined;
        if (content) return content;
        // Empty completion (e.g. reasoning ate the whole max_tokens budget) —
        // a retry won't produce more tokens, so stop here.
        console.error(`[groq:${params.label}] empty completion`, json.choices?.[0]?.finish_reason);
        return null;
      }

      // Permanent client errors (bad request, auth, payload too large) won't
      // improve on retry.
      if (res.status !== 429 && res.status < 500) {
        const errJson = await res.json().catch(() => null);
        console.error(`[groq:${params.label}] non-retryable`, res.status, errJson?.error?.type, errJson?.error?.code);
        return null;
      }

      // 429 / 5xx — retryable. Fall through to backoff unless out of attempts.
      console.warn(`[groq:${params.label}] retryable ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS})`);
    } catch (err) {
      // Network error or per-attempt timeout — also retryable.
      console.warn(`[groq:${params.label}] ${(err as Error).name} (attempt ${attempt}/${MAX_ATTEMPTS})`);
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(retryDelayMs(res, attempt));
    }
  }

  console.error(`[groq:${params.label}] gave up after ${MAX_ATTEMPTS} attempts`);
  return null;
}
