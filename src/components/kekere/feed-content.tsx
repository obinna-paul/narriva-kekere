"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { FEED_GENRES } from "@/content/feed-categories";
import type { MockStory } from "@/content/mock/kekere-stories";
import type { WinnerStory } from "@/app/(kekere)/kekere/feed/page";

function thumbnailPattern(seed: string): string {
  const i = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const patterns = [
    "repeating-linear-gradient(45deg,#C75D2C 0 14px,#A84A20 14px 28px)",
    "conic-gradient(from 30deg,#1F4B4B,#2E6A5E,#1F4B4B,#143838,#1F4B4B)",
    "radial-gradient(circle at 30% 30%,#E2A565,#C75D2C 45%,#7A3415)",
    "linear-gradient(135deg,#1F4B4B 0 50%,#E2A565 50% 100%)",
    "conic-gradient(#C75D2C 0 25%,#E2A565 0 50%,#C75D2C 0 75%,#E2A565 0)",
    "repeating-linear-gradient(0deg,#2A1A12 0 7px,#3A2418 7px 14px)",
    "repeating-radial-gradient(circle at 50% 50%,#E2A565 0 9px,#C75D2C 9px 18px)",
  ];
  return patterns[i % patterns.length];
}

function RowCard({ story }: { story: MockStory }) {
  return (
    <Link
      href={`/kekere/story/${story.id}`}
      className="block w-[200px] flex-none"
      style={{ scrollSnapAlign: "start" }}
    >
      <div
        className="relative h-[124px] overflow-hidden rounded-[14px] shadow-[0_8px_20px_-10px_rgba(42,26,18,0.4)] transition-[filter] hover:brightness-[0.92]"
        style={{ background: thumbnailPattern(story.id) }}
      >
        <span className="absolute left-[9px] top-[9px] rounded-[20px] bg-[rgba(31,75,75,0.78)] px-2 py-[3px] text-[9.5px] font-semibold text-white">
          {story.genre.toUpperCase()}
        </span>
        {story.isFree && (
          <span className="absolute right-[9px] top-[9px] rounded-[20px] bg-[var(--color-sand-accent)] px-2 py-[3px] text-[9.5px] font-bold text-[var(--color-accent)]">
            FREE
          </span>
        )}
        {story.completionRate > 0.8 && (
          <span className="absolute bottom-[9px] right-[9px] rounded-[20px] bg-[rgba(42,26,18,0.55)] px-[7px] py-[3px] text-[9.5px] font-semibold text-white">
            {Math.round(story.completionRate * 100)}% finish
          </span>
        )}
      </div>
      <h3 className="mt-[10px] font-[family-name:var(--font-display)] text-base font-semibold leading-[1.2] text-[var(--color-ink)]">
        {story.title}
      </h3>
      <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] italic leading-[1.35] text-[var(--color-ink-muted)]">
        {story.hookLine}
      </p>
      <p className="mt-[7px] text-xs text-[var(--color-ink-muted-2)]">
        <span className={cn("font-semibold", story.isFree ? "text-[var(--color-success)]" : "text-[var(--color-primary)]")}>
          {story.isFree ? "Free" : `${story.cowrieCost} cowries`}
        </span>
        {" · "}
        {story.readingTimeMinutes} min
      </p>
    </Link>
  );
}

function StoryRow({ title, stories }: { title: string; stories: readonly MockStory[] }) {
  if (stories.length === 0) return null;
  return (
    <section className="py-2">
      <h2 className="px-5 pb-[14px] font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">
        {title}
      </h2>
      <div
        className="scrollx flex gap-[14px] overflow-x-auto px-5 pb-1"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {stories.map((story) => (
          <RowCard key={story.id} story={story} />
        ))}
        <div className="w-[6px] flex-none" />
      </div>
    </section>
  );
}

function storyMatchesGenre(story: MockStory, genreLabel: string): boolean {
  const g = story.genre.toLowerCase();
  const label = genreLabel.toLowerCase();

  if (label === "general fiction") return true;

  if (label === "romance" && (g.includes("romance") || g.includes("love"))) return true;
  if (label === "thriller" && g.includes("thriller")) return true;
  if (label === "speculative fiction" && (g.includes("speculative") || g.includes("sci-fi") || g.includes("science fiction"))) return true;
  if (label === "horror" && g.includes("horror")) return true;
  if (label === "drama" && g.includes("drama")) return true;
  if (label === "comedy" && (g.includes("comedy") || g.includes("humour"))) return true;
  if (label === "erotica" && g.includes("erotica")) return true;
  if (label === "lagos" && (g.includes("lagos") || story.hookLine.toLowerCase().includes("lagos"))) return true;
  if (label === "crime" && (g.includes("crime") || g.includes("thriller"))) return true;
  if (label === "historical fiction" && (g.includes("historical") || g.includes("history"))) return true;

  return g.includes(label);
}

export interface FeedContentProps {
  allStories: readonly MockStory[];
  featuredStory: MockStory | null;
  winnerStories: readonly WinnerStory[];
  balance: number;
}

export function FeedContent({ allStories, featuredStory, winnerStories, balance }: FeedContentProps) {
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("General Fiction");
  const [genreOpen, setGenreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!genreOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setGenreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [genreOpen]);

  const genreStories = useMemo(() => {
    let base = selectedGenre === "General Fiction"
      ? allStories
      : allStories.filter((s) => storyMatchesGenre(s, selectedGenre));
    if (showFreeOnly) base = base.filter((s) => s.isFree);
    return base;
  }, [allStories, selectedGenre, showFreeOnly]);

  const genreConfig = useMemo(
    () => FEED_GENRES.find((g) => g.label === selectedGenre) ?? FEED_GENRES[0],
    [selectedGenre],
  );

  const rows = useMemo(() => {
    if (showFreeOnly) {
      const free = genreStories;
      return free.length > 0 ? [{ name: "Free reads", stories: free }] : [];
    }

    return genreConfig.rows.map((row) => {
      let filtered = genreStories;
      if (row.freeOnly) filtered = filtered.filter((s) => s.isFree);
      if (row.genre) filtered = filtered.filter((s) => storyMatchesGenre(s, row.genre!));
      const stories = filtered.slice(0, 6);
      return { name: row.name, stories };
    });
  }, [genreStories, genreConfig, showFreeOnly]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20 text-[var(--color-ink)]">
      <div className="sticky top-0 z-30 bg-[rgba(245,235,221,0.94)] backdrop-blur-[10px]">
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <span className="font-[family-name:var(--font-display)] text-[21px] font-semibold text-[var(--color-primary)]">
            Kekere
          </span>
          <Link
            href="/kekere/wallet"
            className="flex items-center gap-[7px] rounded-[30px] border border-[rgba(42,26,18,0.1)] bg-white px-[14px] py-[7px]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
              <ellipse cx="12" cy="12" rx="6" ry="9" fill="#C75D2C" />
              <path d="M12 5 Q13.5 12 12 19 M12 5 Q10.5 12 12 19" stroke="#F5EBDD" strokeWidth="1.1" fill="none" />
            </svg>
            <span className="text-[13px] font-semibold text-[var(--color-ink)]">{balance}</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 px-5 pb-[14px] pt-1">
          <button
            type="button"
            onClick={() => setShowFreeOnly(false)}
            className={cn(
              "flex-none cursor-pointer rounded-[30px] border px-4 py-[8px] text-[13.5px] font-semibold transition-colors",
              !showFreeOnly
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                : "border-[rgba(42,26,18,0.14)] bg-white text-[var(--color-ink-muted)]",
            )}
          >
            Browse
          </button>

          <button
            type="button"
            onClick={() => setShowFreeOnly(true)}
            className={cn(
              "flex-none cursor-pointer rounded-[30px] border px-4 py-[8px] text-[13.5px] font-semibold transition-colors",
              showFreeOnly
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                : "border-[rgba(42,26,18,0.14)] bg-white text-[var(--color-ink-muted)]",
            )}
          >
            Free
          </button>

          <div ref={dropdownRef} className="relative flex-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setGenreOpen(!genreOpen);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-1 rounded-[30px] border px-4 py-[8px] text-[13.5px] font-semibold transition-colors",
                selectedGenre !== "General Fiction"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : "border-[rgba(42,26,18,0.14)] bg-white text-[var(--color-ink-muted)]",
              )}
            >
              {selectedGenre} ▾
            </button>
            {genreOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-[340px] w-[220px] overflow-y-auto rounded-2xl border border-[rgba(42,26,18,0.1)] bg-white p-2 shadow-[0_16px_40px_-14px_rgba(42,26,18,0.35)]">
                {FEED_GENRES.map((g) => (
                  <button
                    key={g.label}
                    type="button"
                    onClick={() => {
                      setSelectedGenre(g.label);
                      setGenreOpen(false);
                      setShowFreeOnly(false);
                    }}
                    className={cn(
                      "block w-full rounded-xl px-3 py-[10px] text-left text-[13.5px] font-semibold transition-colors",
                      selectedGenre === g.label
                        ? "bg-[var(--color-primary-muted)] text-[var(--color-primary)]"
                        : "text-[var(--color-ink-muted)] hover:bg-[rgba(42,26,18,0.04)]",
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!showFreeOnly && winnerStories.length > 0 && (
        <section className="py-2">
          <h2 className="flex items-center gap-2 px-5 pb-[14px] font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">
            <span aria-hidden="true" className="text-2xl">&#127942;</span>
            Winners&apos; Circle
          </h2>
          <div
            className="scrollx flex gap-[14px] overflow-x-auto px-5 pb-1"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {winnerStories.map((story) => (
              <Link
                key={story.id}
                href={`/kekere/story/${story.id}`}
                className="block w-[200px] flex-none"
                style={{ scrollSnapAlign: "start" }}
              >
                <div
                  className="relative h-[124px] overflow-hidden rounded-[14px] shadow-[0_8px_20px_-10px_rgba(42,26,18,0.4)] transition-[filter] hover:brightness-[0.92]"
                  style={{ background: thumbnailPattern(story.id) }}
                >
                  <span className="absolute left-[9px] top-[9px] rounded-[20px] bg-[rgba(31,75,75,0.78)] px-2 py-[3px] text-[9.5px] font-semibold text-white">
                    {story.genre.toUpperCase()}
                  </span>
                  <span
                    className="absolute bottom-[9px] left-[9px] flex items-center gap-1 rounded-[20px] px-[7px] py-[3px] text-[9.5px] font-semibold text-white"
                    style={{
                      background: story.placement === 1
                        ? "rgba(199,93,44,0.9)"
                        : "rgba(42,26,18,0.55)",
                    }}
                  >
                    <span aria-hidden="true">
                      {story.placement === 1 ? "\u{1F3C6}" : "\u{1F3C5}"}
                    </span>
                    {story.placement === 1 ? "Winner" : "Runner-up"}
                  </span>
                </div>
                <h3 className="mt-[10px] font-[family-name:var(--font-display)] text-base font-semibold leading-[1.2] text-[var(--color-ink)]">
                  {story.title}
                </h3>
                <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] italic leading-[1.35] text-[var(--color-ink-muted)]">
                  {story.hookLine}
                </p>
                <p className="mt-[7px] text-xs text-[var(--color-ink-muted-2)]">
                  <span className="font-semibold text-[var(--color-primary)]">
                    {story.competitionTitle}
                  </span>
                </p>
              </Link>
            ))}
            <div className="w-[6px] flex-none" />
          </div>
        </section>
      )}

      {!showFreeOnly && featuredStory && (
        <section className="px-5 py-[18px]">
          <Link
            href={`/kekere/story/${featuredStory.id}`}
            className="relative block h-[220px] overflow-hidden rounded-[18px]"
            style={{ background: "radial-gradient(circle at 70% 20%,#E2A565,#C75D2C 45%,#5A2410)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(42,26,18,0.9)] to-[rgba(42,26,18,0.1)_60%]" />
            <div className="absolute bottom-5 left-5 right-5">
              <span className="text-[10px] font-semibold tracking-[0.08em] text-[var(--color-sand-accent)]">
                FEATURED TODAY
              </span>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-[25px] font-semibold leading-[1.12] text-white">
                {featuredStory.title}
              </h3>
              <p className="mt-[6px] text-[13.5px] italic text-[rgba(255,255,255,0.85)]">{featuredStory.hookLine}</p>
              <div className="mt-[14px] flex items-center gap-3">
                <span className="rounded-lg bg-[var(--color-sand-accent)] px-[18px] py-[9px] text-[13px] font-semibold text-[#2A1A12]">▶ Read</span>
                <span className="text-[12.5px] text-[rgba(255,255,255,0.8)]">
                  {featuredStory.isFree ? "Free" : `${featuredStory.cowrieCost} cowries`}
                  {" · "}{featuredStory.readingTimeMinutes} min{" · "}
                  {Math.round(featuredStory.completionRate * 100)}% finish
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {rows.map((row) => (
        <StoryRow key={row.name} title={row.name} stories={row.stories} />
      ))}

      {rows.every((r) => r.stories.length === 0) && (
        <p className="px-5 py-12 text-center text-sm text-[var(--color-ink)]/50">
          No stories match this genre yet — try another.
        </p>
      )}
    </div>
  );
}
