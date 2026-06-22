"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BookCard } from "./book-card";
import { cn } from "@/lib/utils/cn";
import type { MockBook } from "@/content/mock/narriva-home";

export interface FeaturedBooksCarouselProps {
  books: readonly MockBook[];
}

/** Auto-advances every 4.5s, pauses on hover/focus, and honours prefers-reduced-motion. */
export function FeaturedBooksCarousel({ books }: FeaturedBooksCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % books.length);
    }, 4500);
    return () => clearInterval(id);
  }, [paused, books.length]);

  useEffect(() => {
    const track = trackRef.current;
    const card = track?.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, [index]);

  function goTo(next: number) {
    setIndex(((next % books.length) + books.length) % books.length);
  }

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div
        ref={trackRef}
        role="region"
        aria-label="Featured books carousel"
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {books.map((book) => (
          <div key={book.slug} className="w-[260px] flex-none snap-start sm:w-[300px]">
            <BookCard book={book} />
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label="Previous book"
          onClick={() => goTo(index - 1)}
          className="rounded-full border border-[var(--color-ink)]/20 p-2 transition-colors hover:bg-[var(--color-ink)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <div role="tablist" aria-label="Choose featured book" className="flex items-center gap-2">
          {books.map((book, i) => (
            <button
              key={book.slug}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show ${book.title}`}
              onClick={() => goTo(i)}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === index ? "bg-[var(--color-primary)]" : "bg-[var(--color-ink)]/20"
              )}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="Next book"
          onClick={() => goTo(index + 1)}
          className="rounded-full border border-[var(--color-ink)]/20 p-2 transition-colors hover:bg-[var(--color-ink)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
