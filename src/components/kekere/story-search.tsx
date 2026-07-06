"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { MockStory } from "@/content/mock/kekere-stories";

const DEBOUNCE_MS = 220;
const MIN_QUERY_LENGTH = 2;

function thumbnailPattern(seed: string): string {
  const i = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const patterns = [
    "repeating-linear-gradient(45deg,#C75D2C 0 14px,#A84A20 14px 28px)",
    "conic-gradient(from 30deg,#1F4B4B,#2E6A5E,#1F4B4B,#143838,#1F4B4B)",
    "radial-gradient(circle at 30% 30%,#E2A565,#C75D2C 45%,#7A3415)",
    "linear-gradient(135deg,#1F4B4B 0 50%,#E2A565 50% 100%)",
    "conic-gradient(#C75D2C 0 25%,#E2A565 0 50%,#C75D2C 0 75%,#E2A565 0)",
  ];
  return patterns[i % patterns.length];
}

export function StorySearch({ onPreview }: { onPreview: (story: MockStory) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MockStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const res = await fetch(`/api/kekere/stories/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        if (requestId === requestIdRef.current) setResults(data.stories ?? []);
      } catch {
        if (requestId === requestIdRef.current) setResults([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
  }

  function selectResult(story: MockStory) {
    onPreview(story);
    close();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIndex >= 0 ? activeIndex : 0];
      if (target) selectResult(target);
    }
  }

  const trimmedQuery = query.trim();
  const showDropdown = trimmedQuery.length >= MIN_QUERY_LENGTH;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search stories"
        className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full border border-[rgba(42,26,18,0.14)] bg-white text-[var(--color-ink-muted)] transition-colors hover:border-[rgba(42,26,18,0.25)]"
      >
        <Search size={16} />
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <div className="flex items-center gap-2 rounded-[30px] border border-[rgba(42,26,18,0.14)] bg-white px-4 py-[8px]">
        <Search size={15} className="flex-none text-[var(--color-ink-muted-2)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search stories by title…"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted-2)]"
        />
        <button type="button" onClick={close} aria-label="Close search" className="flex-none text-[var(--color-ink-muted-2)]">
          <X size={15} />
        </button>
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[400px] overflow-y-auto rounded-2xl border border-[rgba(42,26,18,0.1)] bg-white p-2 shadow-[0_16px_40px_-14px_rgba(42,26,18,0.35)]">
          {loading && results.length === 0 ? (
            <div className="px-3 py-4 text-center text-[13px] text-[var(--color-ink-muted-2)]">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-center text-[13px] text-[var(--color-ink-muted-2)]">
              No stories found for &ldquo;{trimmedQuery}&rdquo;
            </div>
          ) : (
            results.map((story, i) => (
              <button
                key={story.id}
                type="button"
                onClick={() => selectResult(story)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                  i === activeIndex ? "bg-[rgba(42,26,18,0.06)]" : "hover:bg-[rgba(42,26,18,0.04)]"
                )}
              >
                <div
                  className="h-[46px] w-[36px] flex-none overflow-hidden rounded-[8px]"
                  style={{ background: story.coverImageUrl ? undefined : thumbnailPattern(story.id) }}
                >
                  {story.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={story.coverImageUrl} alt="" className="h-full w-full object-cover object-center" loading="lazy" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{story.title}</p>
                  <p className="truncate text-[11.5px] text-[var(--color-ink-muted-2)]">
                    {story.authorName} · {story.readingTimeMinutes} min
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
