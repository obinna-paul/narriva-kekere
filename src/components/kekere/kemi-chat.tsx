"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { generateUUID } from "@/lib/utils/uuid";
import { MatureBadge } from "@/components/kekere/MatureBadge";
import type { KemiRecommendation } from "@/app/api/kekere/kemi/chat/route";

interface KemiMessage {
  role: "user" | "kemi";
  text: string;
  recommendations?: KemiRecommendation[];
  isAway?: boolean;
}

const QUICK_STARTS = ["Surprise me", "Something funny", "I've got 10 minutes", "Make me cry"];

const INTRO =
  "Hey, I'm Kemi 👋 Tell me what you're in the mood for and I'll find you something good — or just say \"surprise me.\"";

/** Site-wide floating companion for logged-in Kekere readers — story
 *  recommendations plus app support, powered by Groq (see /lib/kemi/ai.ts).
 *  Deliberately not a blocking modal: no backdrop, no scroll lock, so a
 *  reader can keep browsing the feed underneath while chatting, same as
 *  Narriva's NariWidget. */
export function KemiChat() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<KemiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionId = useRef(
    typeof window !== "undefined" ? localStorage.getItem("kemi-sid") ?? generateUUID() : generateUUID(),
  );
  if (typeof window !== "undefined") {
    localStorage.setItem("kemi-sid", sessionId.current);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  function handleOpen() {
    setOpen(true);
    if (messages.length === 0) {
      setMessages([{ role: "kemi", text: INTRO }]);
    }
  }

  async function send(text: string) {
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
        { role: "kemi", text: data.answer, recommendations: data.recommendations, isAway: data.away },
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

  return (
    <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-40 md:bottom-6 md:right-6">
      {open && (
        <div
          role="dialog"
          aria-label="Kemi, your Kekere reading companion"
          className="mb-3 flex h-[min(32rem,70vh)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl shadow-black/20 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-primary)] px-4 py-3 text-white">
            <span className="flex items-center gap-2 font-[family-name:var(--font-display)] font-semibold">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Kemi
            </span>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="rounded p-1 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            <ul className="flex flex-col gap-3">
              {messages.map((message, i) => (
                <li key={i} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
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
                            className="flex items-center gap-2.5 rounded-xl bg-white p-2 text-left shadow-sm ring-1 ring-black/5 transition-transform hover:-translate-y-0.5"
                          >
                            <div
                              className="relative h-14 w-11 flex-none overflow-hidden rounded-[6px]"
                              style={{ backgroundColor: rec.coverColor }}
                            >
                              {rec.coverImageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={rec.coverImageUrl}
                                  alt=""
                                  className="absolute inset-0 h-full w-full object-cover"
                                />
                              )}
                              {rec.isAdult && <MatureBadge className="absolute left-[3px] top-[3px] px-[3px] py-[1px] text-[6.5px]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12.5px] font-semibold text-[var(--color-ink)]">{rec.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] italic text-[var(--color-ink-muted)]">
                                &ldquo;{rec.hookLine}&rdquo;
                              </p>
                              <p className="mt-1 text-[10.5px] font-medium text-[var(--color-primary)]">
                                {rec.cowrieCost === 0 ? "Free" : `${rec.cowrieCost} cowries`} · {rec.readingTime} min
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}

              {messages.length <= 1 && !loading && (
                <li className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_STARTS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => send(chip)}
                      className="rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      {chip}
                    </button>
                  ))}
                </li>
              )}

              {loading && (
                <li className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-[var(--color-ink)]/[0.06] px-4 py-3 text-[13px] text-[var(--color-ink-muted)]">
                    <span className="flex gap-1">
                      <span className="inline-block h-[5px] w-[5px] animate-bounce rounded-full bg-[var(--color-ink)]/40" style={{ animationDelay: "0ms" }} />
                      <span className="inline-block h-[5px] w-[5px] animate-bounce rounded-full bg-[var(--color-ink)]/40" style={{ animationDelay: "150ms" }} />
                      <span className="inline-block h-[5px] w-[5px] animate-bounce rounded-full bg-[var(--color-ink)]/40" style={{ animationDelay: "300ms" }} />
                    </span>
                    Kemi is thinking
                  </div>
                </li>
              )}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-[var(--color-border)] p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Kemi for a story…"
              aria-label="Message Kemi"
              className="flex-1 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-[13.5px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted-2)] focus:border-[var(--color-primary)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-label={open ? "Close Kemi chat" : "Ask Kemi for a story recommendation"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Sparkles className="h-6 w-6" aria-hidden="true" />}
      </button>
    </div>
  );
}
