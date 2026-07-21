"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Send, ChevronRight } from "lucide-react";
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

const KEMI_AVATAR = "/kekere/kemi-avatar.png";

const QUICK_STARTS = ["Surprise me", "Something funny", "I've got 10 minutes", "Make me cry"];

const INTRO =
  "Hey, I'm Kemi 👋 Tell me what you're in the mood for and I'll find you something good — or just say \"surprise me.\"";

/**
 * Kemi's entry point and chat — the third way to find something to read,
 * alongside browsing by tag and search (this component's trigger sits
 * inline with theirs on the feed). The panel is a full bottom sheet, not a
 * small floating widget: a real conversation deserves the same attention
 * as a story preview, so it follows the same sheet/backdrop convention as
 * StoryPreviewSheet rather than Narriva's lightweight coexisting NariWidget.
 */
export function KemiChat() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<KemiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-label="Ask Kemi for a story recommendation"
        className="relative flex cursor-pointer items-center gap-1 rounded-[30px] border border-[rgba(199,93,44,0.35)] bg-white px-4 py-[8px] text-[13.5px] font-semibold text-[var(--color-ink-muted)] transition-colors hover:border-[rgba(199,93,44,0.55)]"
      >
        <span className="kemi-cta-halo" aria-hidden="true" />
        Ask Kemi
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
                                    {rec.cowrieCost === 0 ? "Free" : `${rec.cowrieCost} cowries`} · {rec.readingTime} min
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
                      {QUICK_STARTS.map((chip) => (
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
