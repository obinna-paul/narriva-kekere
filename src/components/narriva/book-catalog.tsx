"use client";

import { useId, useMemo, useState } from "react";
import { BookCard } from "./book-card";
import { Grid } from "@/components/ui/layout";
import { Body, Label } from "@/components/ui/typography";
import { Checkbox } from "@/components/ui/checkbox";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import type { MockAuthor, MockBook } from "@/content/mock/narriva-home";

const ALL = "all";

export interface BookCatalogProps {
  books: readonly MockBook[];
  authors: readonly MockAuthor[];
}

/** Bookstore listing: filter controls run entirely client-side against the
 * static mock array. Real filtering/search against the database is Phase 7. */
export function BookCatalog({ books, authors }: BookCatalogProps) {
  const [genre, setGenre] = useState(ALL);
  const [authorSlug, setAuthorSlug] = useState(ALL);
  const [newOnly, setNewOnly] = useState(false);

  const genres = useMemo(
    () => Array.from(new Set(books.map((b) => b.genre))).sort(),
    [books]
  );

  const filtered = useMemo(() => {
    return books.filter((book) => {
      if (genre !== ALL && book.genre !== genre) return false;
      if (authorSlug !== ALL && book.authorSlug !== authorSlug) return false;
      if (newOnly && !book.isNewRelease) return false;
      return true;
    });
  }, [books, genre, authorSlug, newOnly]);

  function clearFilters() {
    setGenre(ALL);
    setAuthorSlug(ALL);
    setNewOnly(false);
  }

  const hasActiveFilters = genre !== ALL || authorSlug !== ALL || newOnly;
  const genreId = useId();
  const authorId = useId();
  const newReleasesId = useId();

  return (
    <div>
      <div className="flex flex-col gap-6 rounded-lg border border-[var(--color-ink)]/10 p-5 sm:flex-row sm:items-end sm:gap-5 sm:p-6">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor={genreId}>Genre</Label>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger id={genreId}>
              <SelectValue placeholder="All genres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All genres</SelectItem>
              {genres.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor={authorId}>Author</Label>
          <Select value={authorSlug} onValueChange={setAuthorSlug}>
            <SelectTrigger id={authorId}>
              <SelectValue placeholder="All authors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All authors</SelectItem>
              {authors.map((author) => (
                <SelectItem key={author.slug} value={author.slug}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 pb-0.5">
          <Checkbox
            id={newReleasesId}
            checked={newOnly}
            onCheckedChange={(checked) => setNewOnly(checked === true)}
          />
          <Label htmlFor={newReleasesId} className="font-normal tracking-normal">
            New releases only
          </Label>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Clear filters
          </button>
        )}
      </div>

      <Body size="sm" className="mt-6 text-[var(--color-ink)]/60">
        Showing {filtered.length} of {books.length} books
      </Body>

      {filtered.length > 0 ? (
        <Grid cols={3} gap="lg" className="mt-6">
          {filtered.map((book) => (
            <BookCard key={book.slug} book={book} />
          ))}
        </Grid>
      ) : (
        <p className="mt-12 text-center text-[var(--color-ink)]/60">
          No books match your filters.
        </p>
      )}
    </div>
  );
}
