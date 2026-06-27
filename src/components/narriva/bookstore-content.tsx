"use client";

import { useMemo, useState } from "react";
import { BookCard } from "./book-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MockBook } from "@/content/mock/narriva-home";

const ALL = "All genres";

export interface BookstoreContentProps {
  books: readonly MockBook[];
  genres: readonly string[];
}

export function BookstoreContent({ books, genres }: BookstoreContentProps) {
  const [genre, setGenre] = useState(ALL);
  const [sort, setSort] = useState("newest");

  const genreOptions = useMemo(() => [ALL, ...genres], [genres]);

  const filtered = useMemo(() => {
    let list = genre === ALL ? books.slice() : books.filter((b) => b.genre === genre);

    if (sort === "az") {
      list = list.slice().sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "price") {
      list = list.slice().sort((a, b) => a.priceNgn - b.priceNgn);
    }

    return list;
  }, [books, genre, sort]);

  return (
    <>
      <header className="mx-auto max-w-[1240px] px-8 pb-9 pt-[72px]">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)] mb-4">
          The bookstore
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-[52px] font-medium leading-tight tracking-[-0.02em] text-[var(--color-ink)]">
          Every book, built here
        </h1>
        <p className="mt-[18px] max-w-[520px] text-[17px] leading-[1.6] text-[var(--color-muted)]">
          Read in your browser, no download required. Every title was edited, designed, and produced by the Narriva team.
        </p>
      </header>

      <div className="border-y border-[var(--color-ink)]/[0.07]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-5 px-8 py-4">
          <div className="flex flex-wrap items-center gap-[14px]">
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="h-auto rounded-[2px] border-[var(--color-ink)]/20 px-[14px] py-2.5 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {genreOptions.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="rounded-[2px] border border-[var(--color-ink)]/[0.12] bg-[var(--color-ink)]/[0.02] px-[14px] py-2.5 text-[13px] text-[var(--color-muted-3)]">
              Format · Ebook
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[var(--color-muted-3)]">{filtered.length} books</span>
            <div className="h-[18px] w-px bg-[var(--color-ink)]/[0.12]" />
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-auto rounded-[2px] border-[var(--color-ink)]/20 px-[14px] py-2.5 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Sort · Newest</SelectItem>
                <SelectItem value="az">Sort · A–Z</SelectItem>
                <SelectItem value="price">Sort · Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1240px] px-8 pb-24 pt-[54px]">
        <div className="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((book) => (
            <BookCard key={book.slug} book={book} variant="store" />
          ))}
        </div>
      </section>
    </>
  );
}
