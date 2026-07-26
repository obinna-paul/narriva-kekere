"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Send, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { generateUUID } from "@/lib/utils/uuid";
import { MatureBadge } from "@/components/kekere/MatureBadge";
import type { KemiRecommendation } from "@/app/api/kekere/kemi/chat/route";
import {
  buildKemiGreetingPool,
  pickRandomKemiGreeting,
  renderKemiGreeting,
  getLastKemiGreetingKey,
} from "@/content/kemi-chat-greetings";

interface KemiMessage {
  role: "user" | "kemi";
  text: string;
  recommendations?: KemiRecommendation[];
  isAway?: boolean;
  /** True when this reply was Kemi answering a "why did you pick this"
   *  request. Such a reply is already a justification, so it never offers
   *  the pushback chip again — even when she pivots to a different story
   *  mid-answer, which otherwise reads as a fresh recommendation. */
  isWhyAnswer?: boolean;
}

const KEMI_AVATAR = "/kekere/kemi-avatar.png";

const NUDGE_POLL_INTERVAL_MS = 60000;

// A rotating pool rather than one fixed set — the same 4 chips every single
// time a reader opens Kemi would start to feel like decoration, not real
// options. Rotates once a day, same idea as the feed's Editor's Pick
// rotation (feed/page.tsx's `todaySeed`), so it's stable within a session
// but not frozen forever.
const MOOD_CHIPS = [
  "Surprise me",
  "Something funny",
  "I've got 10 minutes",
  "Make me cry",
  "Something heartwarming",
  "I want a twist",
];

// Ways to push back on a pick. These are the READER's words, not Kemi's, so
// they're written as the half-teasing, half-curious register people actually
// fall into with her — a flat "Why this one?" every single time made the
// affordance feel like a system button rather than part of the conversation.
// Kept short: they render as a chip and send verbatim as a message.
const WHY_CHIPS_SINGLE = [
  "Why this one?",
  "Sell it to me",
  "Convince me",
  "Go on, justify it",
  "What made you pick this?",
  "Hmm. Why?",
  "Make your case",
  "Why do you think I'll like it?",
];

const WHY_CHIPS_MULTI = [
  "Why these?",
  "Sell me on these",
  "Make your case",
  "What made you pick these?",
  "Convince me",
];

/** Picks the pushback chip for a given recommendation. Seeded by the slug
 *  signature so it stays put while that pitch is on screen — a chip whose
 *  wording changed under the reader's thumb on every re-render would read as
 *  a glitch, not personality. */
function pickWhyChip(signature: string, count: number): string {
  const pool = count > 1 ? WHY_CHIPS_MULTI : WHY_CHIPS_SINGLE;
  let hash = 0;
  for (let i = 0; i < signature.length; i++) hash = (hash * 31 + signature.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

/** Builds this reader's quick-start chips: a taste-based slot up front when
 *  we have one, then enough rotating mood chips to fill out to 4 total. */
function buildQuickStarts(topGenre: string | null): string[] {
  const personalized = topGenre ? `More ${topGenre} please` : null;

  const daySeed = Math.floor(Date.now() / 86400000);
  const offset = daySeed % MOOD_CHIPS.length;
  const rotated = [...MOOD_CHIPS.slice(offset), ...MOOD_CHIPS.slice(0, offset)];
  const rotatingSlots = personalized ? 3 : 4;

  return personalized ? [personalized, ...rotated.slice(0, rotatingSlots)] : rotated.slice(0, rotatingSlots);
}

/**
 * Kemi's entry point and chat — the third way to find something to read,
 * alongside browsing by tag and search (this component's trigger sits
 * inline with theirs on the feed). The panel is a full bottom sheet, not a
 * small floating widget: a real conversation deserves the same attention
 * as a story preview, so it follows the same sheet/backdrop convention as
 * StoryPreviewSheet rather than Narriva's lightweight coexisting NariWidget.
 */
export function KemiChat({
  readerName,
  readerId,
  topGenre = null,
}: {
  readerName?: string;
  readerId?: string | null;
  topGenre?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<KemiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [askedWhyFor, setAskedWhyFor] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const quickStarts = useRef(buildQuickStarts(topGenre)).current;

  const sessionId = useRef(
    typeof window !== "undefined" ? localStorage.getItem("kemi-sid") ?? generateUUID() : generateUUID(),
  );
  if (typeof window !== "undefined") {
    localStorage.setItem("kemi-sid", sessionId.current);
  }

  const pickGreeting = useCallback(() => {
    const pool = buildKemiGreetingPool(readerName);
    const lastKey = getLastKemiGreetingKey(readerId);
    let avoidText: string | null = null;
    try {
      avoidText = localStorage.getItem(lastKey);
    } catch {
      // localStorage unavailable — skip avoidance
    }
    const template = pickRandomKemiGreeting(pool, avoidText);
    const text = renderKemiGreeting(template, readerName);
    try {
      localStorage.setItem(lastKey, text);
    } catch {
      // localStorage unavailable — skip persistence
    }
    return text;
  }, [readerName, readerId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Poll for openers Kemi has queued while the panel is closed. Cheap
  // (a count, no content) and stops entirely while the panel is open, since
  // opening it delivers everything pending anyway.
  useEffect(() => {
    if (!readerId || open) return;
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/kekere/kemi/nudges");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUnreadCount(data.pendingCount ?? 0);
      } catch {
        // Best-effort — a missing dot is a fine failure mode.
      }
    }
    check();
    const interval = setInterval(check, NUDGE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [readerId, open]);

  async function handleOpen() {
    setOpen(true);
    // Opening is what delivers pending nudges, so the dot is spent the
    // moment the panel is up — don't leave it glowing over an open chat.
    setUnreadCount(0);

    // The transcript lives server-side and always has; it was simply never
    // read back, so every close wiped the conversation. Load it once per
    // mount, then fall back to a fresh greeting only for a genuinely empty
    // history.
    if (hydrated) return;
    setHydrated(true);
    try {
      const res = await fetch(`/api/kekere/kemi/conversation?sessionId=${encodeURIComponent(sessionId.current)}`);
      if (res.ok) {
        const data = await res.json();
        const restored: KemiMessage[] = data.messages ?? [];
        if (restored.length > 0) {
          setMessages(restored);
          return;
        }
      }
    } catch {
      // Fall through to the greeting — a lost transcript shouldn't leave
      // the reader staring at an empty panel.
    }
    setMessages((prev) => (prev.length === 0 ? [{ role: "kemi", text: pickGreeting() }] : prev));
  }

  async function send(text: string, opts: { isWhyRequest?: boolean } = {}) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/kekere/kemi/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionId: sessionId.current }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "kemi", text: "Hmm, something hiccuped on my end. Try again in a moment?", isAway: true },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "kemi",
          text: data.answer,
          recommendations: data.recommendations,
          isAway: data.away,
          isWhyAnswer: opts.isWhyRequest,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "kemi", text: "Hmm, something hiccuped on my end. Try again in a moment?", isAway: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function openStory(slug: string) {
    router.push(`/kekere/story/${slug}`);
  }

  // Pushback on a pick is offered as a real, tappable follow-up rather than
  // something a reader has to know they're allowed to ask. Only under the
  // NEWEST message, and only while it's still the last thing said — once
  // the reader moves on, the prompt goes with it instead of littering the
  // transcript with stale chips beside every past recommendation.
  //
  // Keyed by the set of stories being pitched, not by message position: when
  // asked to justify a pick, Kemi frequently re-emits the same RECOMMEND line
  // (her prompt tells her not to, but the model doesn't reliably obey), which
  // renders the card a second time. Position-based tracking let that count as
  // a brand-new recommendation and offered the chip again on a question the
  // reader had just asked. Matching on the slugs makes re-pitching the same
  // story a no-op no matter how the model phrases its reply.
  //
  // A reply that was itself an answer to "why" never offers the chip again,
  // regardless of slugs. Kemi often pivots to a DIFFERENT story while
  // justifying the first one, and that pivot is a legitimately new slug set
  // — so the signature check alone would offer "why" on a message that was
  // already a justification, asking her to justify a justification.
  const lastMessage = messages[messages.length - 1];
  const lastRecs = lastMessage?.role === "kemi" ? lastMessage.recommendations ?? [] : [];
  const recSignature = lastRecs.map((r) => r.slug).sort().join("|");
  const showWhyThisOne =
    !loading &&
    recSignature.length > 0 &&
    !lastMessage?.isWhyAnswer &&
    !askedWhyFor.includes(recSignature);
  const whyChipLabel = pickWhyChip(recSignature, lastRecs.length);

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-label={
          unreadCount > 0
            ? "Ask Kemi — she has a new message for you"
            : "Ask Kemi for a story recommendation"
        }
        className="relative flex cursor-pointer items-center gap-1 rounded-[30px] border border-[rgba(199,93,44,0.35)] bg-white px-4 py-[8px] text-[13.5px] font-semibold text-[var(--color-ink-muted)] transition-colors hover:border-[rgba(199,93,44,0.55)]"
      >
        <span className="kemi-cta-halo" aria-hidden="true" />
        Ask Kemi
        {unreadCount > 0 && (
          // Unread marker for a message Kemi sent on her own. Count is
          // deliberately not shown — she opens a conversation, she doesn't
          // deliver a queue, and "3" would frame it as a backlog to clear.
          <span
            aria-hidden="true"
            className="absolute -right-[3px] -top-[3px] h-[9px] w-[9px] rounded-full bg-[var(--color-primary)] ring-2 ring-white"
          />
        )}
      </button>

      {open &&
        createPortal(
          <>
            {/* Rendered via portal into document.body — the trigger lives
                inside the feed's sticky header, which sets backdrop-blur and
                therefore a CSS containing block; a fixed-position child of
                that header is trapped inside its (small) box instead of
                covering the viewport. Escaping to body sidesteps that. */}
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Kemi, your Kekere reading companion"
              className="fixed inset-x-0 bottom-0 z-50 flex h-[min(85vh,42rem)] flex-col overflow-hidden rounded-t-[24px] bg-[var(--color-bg)] shadow-[0_-20px_60px_-10px_rgba(42,26,18,0.5)]"
            >
              {/* Drag handle */}
              <div className="flex flex-none justify-center pb-1 pt-3">
                <div className="h-[3px] w-10 rounded-full bg-[rgba(42,26,18,0.18)]" />
              </div>

              {/* Header */}
              <div className="flex flex-none items-center justify-between px-5 pb-3 pt-1">
                <div className="flex items-center gap-2.5">
                  <span className="h-9 w-9 flex-none overflow-hidden rounded-full ring-2 ring-[var(--color-primary)]/70">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={KEMI_AVATAR} alt="" className="h-full w-full object-cover" />
                  </span>
                  <p className="font-[family-name:var(--font-display)] text-[15.5px] font-semibold leading-tight text-[var(--color-ink)]">
                    Kemi
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close chat"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[var(--color-ink-muted)] transition-colors hover:bg-black/5"
                >
                  <X size={17} aria-hidden="true" />
                </button>
              </div>
              <div className="h-px flex-none bg-[var(--color-border)]" />

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
                <ul className="flex flex-col gap-3">
                  {messages.map((message, i) => (
                    <li key={i} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed",
                          message.role === "user"
                            ? "bg-[var(--color-primary)] text-white"
                            : message.isAway
                              ? "bg-[var(--color-primary)]/8 italic text-[var(--color-ink-muted)]"
                              : "bg-[var(--color-ink)]/[0.06] text-[var(--color-ink)]",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.text}</p>

                        {message.recommendations && message.recommendations.length > 0 && (
                          <div className="mt-2.5 flex flex-col gap-2">
                            {message.recommendations.map((rec) => (
                              <button
                                key={rec.slug}
                                type="button"
                                onClick={() => openStory(rec.slug)}
                                className="group flex items-center gap-3 rounded-xl bg-white p-2.5 text-left shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                              >
                                <div
                                  className="relative h-16 w-[52px] flex-none overflow-hidden rounded-[8px]"
                                  style={{ backgroundColor: rec.coverColor }}
                                >
                                  {rec.coverImageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={rec.coverImageUrl}
                                      alt=""
                                      className="absolute inset-0 h-full w-full object-cover"
                                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                                    />
                                  )}
                                  {rec.isAdult && (
                                    <MatureBadge className="absolute left-[3px] top-[3px] px-[3px] py-[1px] text-[6.5px]" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-semibold text-[var(--color-ink)]">{rec.title}</p>
                                  <p className="mt-0.5 line-clamp-2 text-[11.5px] italic text-[var(--color-ink-muted)]">
                                    &ldquo;{rec.hookLine}&rdquo;
                                  </p>
                                  <p className="mt-1 text-[11px] font-medium text-[var(--color-primary)]">
                                    {rec.cowrieCost} cowries · {rec.readingTime} min
                                  </p>
                                </div>
                                <ChevronRight
                                  size={16}
                                  className="flex-none text-[var(--color-ink-muted-2)] transition-transform group-hover:translate-x-0.5"
                                  aria-hidden="true"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}

                  {messages.length <= 1 && !loading && (
                    <li className="flex flex-wrap gap-1.5 pt-1">
                      {quickStarts.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => send(chip)}
                          className="rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-[12.5px] font-medium text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                        >
                          {chip}
                        </button>
                      ))}
                    </li>
                  )}

                  {showWhyThisOne && (
                    <li className="flex pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAskedWhyFor((prev) => [...prev, recSignature]);
                          send(whyChipLabel, { isWhyRequest: true });
                        }}
                        className="rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-[12.5px] font-medium text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      >
                        {whyChipLabel}
                      </button>
                    </li>
                  )}

                  {loading && (
                    <li className="flex justify-start" aria-label="Kemi is typing">
                      <div className="flex items-center gap-1 rounded-2xl bg-[var(--color-ink)]/[0.06] px-4 py-3">
                        <span className="inline-block h-[6px] w-[6px] animate-bounce rounded-full bg-[var(--color-ink)]/40" style={{ animationDelay: "0ms" }} />
                        <span className="inline-block h-[6px] w-[6px] animate-bounce rounded-full bg-[var(--color-ink)]/40" style={{ animationDelay: "150ms" }} />
                        <span className="inline-block h-[6px] w-[6px] animate-bounce rounded-full bg-[var(--color-ink)]/40" style={{ animationDelay: "300ms" }} />
                      </div>
                    </li>
                  )}
                </ul>
              </div>

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                className="flex flex-none gap-2 border-t border-[var(--color-border)] px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Kemi for a story…"
                  aria-label="Message Kemi"
                  className="flex-1 rounded-full border border-[var(--color-border)] bg-white px-4 py-2.5 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted-2)] focus:border-[var(--color-primary)] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Send"
                  className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
