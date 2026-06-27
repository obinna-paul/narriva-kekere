"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { NARI_INTRO_MESSAGE } from "@/content/nari-faq";

interface NariMessage {
  role: "user" | "nari";
  text: string;
  links?: { label: string; href: string }[];
  isFallback?: boolean;
}

/**
 * Site-wide floating widget. Nari is powered by GPT-4o-mini with a
 * comprehensive system prompt covering all of Narriva's services and
 * publishing knowledge. Falls back to keyword matching when the AI is
 * unavailable for any reason.
 */
export function NariWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<NariMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionId = useRef(
    typeof window !== "undefined"
      ? localStorage.getItem("nari-sid") ?? crypto.randomUUID()
      : crypto.randomUUID(),
  );
  if (typeof window !== "undefined") {
    localStorage.setItem("nari-sid", sessionId.current);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  function handleOpen() {
    setOpen(true);
    if (messages.length === 0) {
      setMessages([{ role: "nari", text: NARI_INTRO_MESSAGE }]);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setQuestion("");
    setLoading(true);

    const history = messages.map((m) => ({ role: m.role, text: m.text }));

    try {
      const res = await fetch("/api/nari/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history, sessionId: sessionId.current }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "nari",
          text: data.answer,
          links: data.links,
          isFallback: data.matched === false,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "nari",
          text: "Something went wrong on our end. Try again in a moment, or reach out directly.",
          links: [{ label: "Book a call", href: "/contact" }],
          isFallback: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div
          role="dialog"
          aria-label="Nari, Narriva's assistant"
          className="mb-3 flex h-[28rem] w-80 flex-col overflow-hidden rounded-lg border border-[var(--color-ink)]/10 bg-[var(--color-bg)] shadow-xl sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-ink)]/10 bg-[var(--color-primary)] px-4 py-3 text-[var(--color-bg)]">
            <span className="font-[family-name:var(--font-display)] font-semibold">Nari</span>
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
                <li
                  key={i}
                  className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      message.role === "user"
                        ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                        : "bg-[var(--color-ink)]/[0.06] text-[var(--color-ink)]"
                    )}
                  >
                    <div
                      className="text-sm whitespace-pre-wrap leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: message.text
                          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="font-semibold text-[var(--color-primary)] underline">$1</a>'),
                      }}
                    />
                    {message.links && message.links.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {message.links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                              buttonVariants({
                                size: "sm",
                                variant: message.isFallback ? "primary" : "secondary",
                              }),
                              "justify-center"
                            )}
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {loading && (
                <li className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-lg bg-[var(--color-ink)]/[0.06] px-4 py-3 text-sm text-[var(--color-ink)]/60">
                    <span className="flex gap-1">
                      <span className="inline-block h-[5px] w-[5px] animate-bounce rounded-full bg-[var(--color-ink)]/40" style={{ animationDelay: "0ms" }} />
                      <span className="inline-block h-[5px] w-[5px] animate-bounce rounded-full bg-[var(--color-ink)]/40" style={{ animationDelay: "150ms" }} />
                      <span className="inline-block h-[5px] w-[5px] animate-bounce rounded-full bg-[var(--color-ink)]/40" style={{ animationDelay: "300ms" }} />
                    </span>
                    Nari is thinking
                  </div>
                </li>
              )}
            </ul>
          </div>

          <form onSubmit={handleSend} className="flex gap-2 border-t border-[var(--color-ink)]/10 p-3">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask Nari a question…"
              aria-label="Your question for Nari"
              className="flex-1"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              aria-label="Send"
              className={cn(buttonVariants({ size: "sm" }), "px-3")}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-label={open ? "Close Nari chat" : "Open Nari chat"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-bg)] shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
