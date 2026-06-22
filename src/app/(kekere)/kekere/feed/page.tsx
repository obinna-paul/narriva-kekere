"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KekereTheme } from "@/components/theme";
import { Heading } from "@/components/ui/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { KekereNav } from "@/components/kekere/kekere-nav";
import { StoryCard } from "@/components/kekere/story-card";
import { KEKERE_GENRES } from "@/content/mock/kekere-stories";
import type { MockStory } from "@/content/mock/kekere-stories";

type QuickFilter = "all" | "new" | "trending" | "free";
const PAGE_SIZE = 12;

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "trending", label: "Trending" },
  { value: "free", label: "Free" },
];

interface StoriesResponse {
  stories: MockStory[];
  total: number;
  page: number;
  totalPages: number;
}

export default function KekereFeedPage() {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [genre, setGenre] = useState<string>("all");
  const [stories, setStories] = useState<MockStory[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("pageSize", String(PAGE_SIZE));
    if (quickFilter === "trending") params.set("sort", "trending");
    if (quickFilter === "free") params.set("free", "true");
    if (genre !== "all") params.set("genre", genre);
    return params.toString();
  }, [quickFilter, genre]);

  // Each filter change resets to page 1 and replaces the accumulated list.
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);

    fetch(`/api/kekere/stories?${queryString}&page=1`)
      .then((res) => res.json())
      .then((data: StoriesResponse) => {
        if (requestId !== requestIdRef.current) return;
        setStories(data.stories);
        setPage(1);
        setTotalPages(data.totalPages);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  }, [queryString]);

  const loadMore = useCallback(() => {
    if (loading || page >= totalPages) return;
    const requestId = ++requestIdRef.current;
    const nextPage = page + 1;
    setLoading(true);

    fetch(`/api/kekere/stories?${queryString}&page=${nextPage}`)
      .then((res) => res.json())
      .then((data: StoriesResponse) => {
        if (requestId !== requestIdRef.current) return;
        setStories((prev) => [...prev, ...data.stories]);
        setPage(nextPage);
        setTotalPages(data.totalPages);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  }, [loading, page, totalPages, queryString]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // "New" has no server-side filter (no isNew column) — post-filter the
  // accumulated, already-paginated results instead of changing the query.
  const visibleStories = quickFilter === "new" ? stories.filter((s) => s.isNew) : stories;

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNav />

        <main className="mx-auto max-w-5xl px-5 py-6 pb-28 sm:px-8 md:pb-12">
          <Heading as="h1" size="h2">
            Feed
          </Heading>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setQuickFilter(f.value)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  quickFilter === f.value
                    ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                    : "bg-[var(--color-ink)]/[0.06] text-[var(--color-ink)]/70"
                )}
              >
                {f.label}
              </button>
            ))}

            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="ml-auto h-9 w-44">
                <SelectValue placeholder="All genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genres</SelectItem>
                {KEKERE_GENRES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {visibleStories.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visibleStories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : !loading ? (
            <p className="mt-12 text-center text-[var(--color-ink)]/50">
              No stories match these filters yet.
            </p>
          ) : null}

          {(loading || page < totalPages) && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              <span className="text-sm text-[var(--color-ink)]/40">Loading more…</span>
            </div>
          )}
        </main>
      </div>
    </KekereTheme>
  );
}
